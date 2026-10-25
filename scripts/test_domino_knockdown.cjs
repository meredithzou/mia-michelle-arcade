const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};function el(id){return elements[id]??=({width:1000,height:610,style:{},classList:{toggle(){}},setAttribute(){},getBoundingClientRect(){return {left:0,top:0,width:1000,height:610}},getContext(){return new Proxy({},{get:()=>()=>{}})},setPointerCapture(){},handlers:{},addEventListener(n,fn){this.handlers[n]=fn}})}
const source=fs.readFileSync('games/domino-knockdown/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const box={document:{getElementById:el,addEventListener(){}},window:{},ResizeObserver:class{observe(){}},devicePixelRatio:1,performance:{now:()=>100},requestAnimationFrame(){}};vm.createContext(box);const run=s=>vm.runInContext(s,box);run(source);
run('btn.clear.onclick()');assert.equal(run('points.length'),0);
const event=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,preventDefault(){}});
function stroke(y){el('board').handlers.pointerdown(event(100,y));for(let x=120;x<800;x+=20)el('board').handlers.pointermove(event(x,y));el('board').handlers.pointerup(event(800,y))}
stroke(150);const first=run('JSON.stringify(paths[0])');stroke(400);assert.equal(run('paths.length'),2);assert.equal(run('JSON.stringify(paths[0])'),first,'second stroke must preserve first line');
run('push();paint(400)');assert(run('running'));run('paint(100000)');assert(run('completed&&!running'));
run('btn.reset.onclick()');assert.equal(run('paths.length'),2);assert(run('!completed'));run('btn.undo.onclick()');assert.equal(run('paths.length'),1);assert.equal(run('JSON.stringify(paths[0])'),first);
run('btn.clear.onclick()');assert.equal(run('paths.length'),0);assert(run('drawing'));assert(el('push').disabled);
el('board').handlers.pointerdown(event(100,150));el('board').handlers.pointermove(event(700,300,2));assert.equal(run('points.length'),1,'ignore another finger');el('board').handlers.pointercancel(event(100,150));assert(run('!dragging'));
run('push();paint(100000)');assert(run('completed'),'single domino can tumble');run('preset()');assert.equal(run('paths.length'),1);console.log('PASS: multiple touch strokes, independent chains, reset, undo, clear, pointer cancellation, single domino, preset');
// Audio regression: enabling gives immediate feedback after resume; disabling mutes it.
(async()=>{
 let started=0,stopped=0,peak=0,resumed=0;
 const param={setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(v){peak=Math.max(peak,v)}};
 class Audio {constructor(){this.state='suspended';this.currentTime=0;this.destination={}}async resume(){resumed++;this.state='running'}createOscillator(){return {type:'',frequency:param,connect(){},disconnect(){},start(){started++},stop(){stopped++}}}createGain(){return {gain:param,connect(){},disconnect(){}}}}
 box.window.AudioContext=Audio;box.navigator={audioSession:{type:'auto'}};
 await run('btn.sound.onclick()');assert.equal(started,1,'Sound On must play preview');assert.equal(resumed,1);assert.equal(box.navigator.audioSession.type,'playback');assert(peak>=.1);
 await run('btn.sound.onclick()');const afterMute=started;run('clickSound()');assert.equal(started,afterMute);assert(stopped>=2,'Off must stop active sounds');
 run("audio.state='interrupted'");await run('btn.sound.onclick()');assert.equal(resumed,2,'resume interrupted iPad context');assert.equal(started,2);
 await run('btn.sound.onclick()');run("audio=null;window.AudioContext=undefined");await run('btn.sound.onclick()');assert(run('!soundOn'));assert(el('hint').textContent.includes('could not start'));
 console.log('PASS: audible enable feedback, mute, iPad playback session, interrupted resume, unavailable audio feedback');
})().catch(e=>{console.error(e);process.exitCode=1});
