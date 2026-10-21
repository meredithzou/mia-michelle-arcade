/**
 * Shared music-module and Name That Note! regression tests.
 * Runs the real game handlers with a fake DOM, then checks note scoring,
 * clef settings, notation geometry, and shared pitch/keyboard behavior.
 * The SVG geometry hash catches unintended changes to music rendering.
 * Run: node scripts/test_music_modules.cjs
 */
// Regression checks for the shared modules and the real Name That Note! handlers.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {fixture}=require('./music_game_fixture.cjs');
const {ctx,ids,game:g}=fixture('name-that-note'),music=ctx.window.ArcadeMusicPitch;
const button=l=>ids.npxletters.children.find(b=>b.textContent===l);
assert.equal(ids.npxletters.children.length,7);
const answer=music.letters[g.q.i%7],wrong=music.letters[(g.q.i+1)%7];button(wrong).onclick();button(answer).onclick();
assert.equal(ids.npxacc.textContent,'0%');assert.equal(g.locked,true);assert.equal(ids.npxnum.textContent,1);
g.restart();button(music.letters[g.q.i%7]).onclick();assert.equal(ids.npxacc.textContent,'100%');
g.next();ids.npxreveal.onclick();assert.equal(g.locked,true);assert.ok(ids.npxmsg.textContent.includes(music.name(g.q.i)));
for(const [index,mode] of ['treble','bass','both','grand'].entries()){
 ids.npxsettings.onclick();ids.npxclefs.children[index].onclick();ids.npxapply.onclick();
 assert.equal(g.cfg.mode,mode);assert.equal(ids.npxletters.children.length,7);assert.ok(ids.npxscore.children.length>=7);
 if(mode==='grand')assert.ok(ids.npxscore.children.length>=14);
}
// Keep the original SVG geometry across both clefs, all note positions/durations,
// and the custom scale/color used by the range control.
const output=[];const s={append(x){output.push(x)}};const n=ctx.window.ArcadeMusicNotation;
for(const c of ['treble','bass'])for(let i=10;i<=46;i++)for(const v of ['quarter','half','whole']){
 n.lines(s,78);n.clef(s,c,78);n.note(s,c,78,i,v);n.note(s,c,98,i,'whole',210,'#258b91',.1);
}
const digest=crypto.createHash('sha256').update(JSON.stringify(output.map(x=>x.attributes))).digest('hex');
assert.equal(digest,'1fc45f05f64a31bdb60fabbbb7d9652b2d15275faae4453bece474a5a7878cbf');
(async()=>{
 let enabled=true,requests=0,decoded=0;const sources=[];
 class Audio{
  state='running';currentTime=0;destination={};
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
  createBufferSource(){const x={playbackRate:{},connect(){},start(){this.started=true},stop(){this.stopped=true}};sources.push(x);return x}
 }
 class Decoder{decodeAudioData(b){decoded++;return Promise.resolve({bytes:b})}}
 const document={hidden:false,addEventListener(){}},window={AudioContext:Audio,OfflineAudioContext:Decoder,addEventListener(){}};
 const sandbox={window,document,navigator:{},AbortController,setTimeout:()=>1,clearTimeout(){},fetch:()=>{requests++;return Promise.resolve({ok:true,arrayBuffer:()=>Promise.resolve(new ArrayBuffer(8))})}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/../shared/music/audio.js','utf8'),sandbox);
 const a=window.ArcadeMusicAudio.create({root:{addEventListener(){},removeEventListener(){}},isEnabled:()=>enabled,getQuestion:()=>null});
 a.prepare([60,61,62,63]);a.prepare([60,61,62,63]);for(let i=0;i<20;i++)await Promise.resolve();
 assert.equal(requests,2);assert.equal(decoded,2);assert.equal(a.readiness([60,61,62,63]).state,'ready');
 let ended=0;
 a.play(61,()=>ended++);assert.equal(sources.length,1);assert.equal(sources[0].playbackRate.value,Math.pow(2,1/12));assert.equal(sources[0].started,true);
 assert.equal(ended,0);a.stop();assert.equal(sources[0].stopped,true);sources[0].onended();assert.equal(ended,0,'Stopped notes do not signal completed playback');
 a.play(60,()=>ended++);assert.equal(sources.length,2);assert.equal(sources[1].started,true);
 sources[1].onended();assert.equal(ended,1,'Natural completion notifies the game');
 a.play(61,()=>ended++);
 enabled=false;a.setEnabled(false);a.play(61);a.prepare([84]);assert.equal(sources.length,3);assert.equal(requests,2);
 sources[2].onended();assert.equal(ended,1,'Muted notes do not signal completed playback');
 console.log('Music modules passed: original SVG geometry, four clef modes, answer/reveal scoring, sample deduplication, MIDI playback and mute.');
})().catch(e=>{console.error(e);process.exitCode=1});
