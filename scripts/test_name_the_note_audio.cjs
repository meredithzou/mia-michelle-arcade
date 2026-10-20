// Run with: node scripts/test_name_the_note_audio.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../games/name-the-note/index.html'),'utf8');
const code=html.slice(html.indexOf('// Recovery is event-driven.'),html.indexOf('const PIANO_SOURCE='));
const recorded=html.slice(html.indexOf('function recorded('),html.indexOf('\nfunction play('));
class Events{
 constructor(){this.listeners=new Map()}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn)}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn)}
 fire(type,event={}){for(const fn of [...(this.listeners.get(type)||[])])fn(event)}
}
function setup(initial='running'){
 let reads=0,now=0;
 const root=new Events(),document=new Events(),window=new Events(),contexts=[],requests=[],sources=[];document.hidden=false;
 class Audio{
  constructor(){this.status=contexts.length?'suspended':initial;this.currentTime=0;this.closed=0;contexts.push(this)}
  get state(){reads++;return this.status}
  destination={};
  createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
  createBufferSource(){const source={playbackRate:{},context:this,connect(){},start(){this.started=true},stop(){}};sources.push(source);return source}
  resume(){return new Promise((ok,bad)=>{requests.push({context:this,finish:()=>{this.status='running';this.onstatechange?.();ok()},fail:()=>bad(Error('gesture needed'))})})}
  close(){this.closed++;this.status='closed';return Promise.resolve()}
 }
 window.AudioContext=Audio;
 const ctx={root,document,window,navigator:{},cfg:{sound:true},q:{},ac:null,bus:null,activeSounds:new Set(),Promise,Math,midi:()=>60,Date:{now:()=>now}};
 vm.createContext(ctx);vm.runInContext(code+recorded,ctx);
 return {ctx,root,document,window,contexts,requests,sources,change(next){ctx.ac.status=next;ctx.ac.onstatechange()},tick(){now+=1100},get reads(){return reads}};
}
async function flush(){for(let i=0;i<8;i++)await Promise.resolve()}
function leave(e){e.document.hidden=true;e.document.fire('visibilitychange')}
function returnToGame(e){e.document.hidden=false;e.document.fire('visibilitychange')}
(async()=>{
 let e=setup(),played=0;e.ctx.withAudio(()=>played++);
 let before=e.reads;for(let i=0;i<50;i++)e.ctx.withAudio(()=>played++);
 assert.equal(e.reads,before);assert.equal(e.requests.length,0);assert.equal(e.contexts.length,1);
 // The old context still claims running and its clock is frozen. Replace on
 // exactly one foreground click, without waiting for its state to report failure.
 const old=e.ctx.ac;let stopped=0;e.ctx.activeSounds.add(()=>stopped++);
 leave(e);returnToGame(e);e.window.fire('pageshow');assert.equal(stopped,1);assert.equal(e.contexts.length,1);
 e.root.fire('click');assert.equal(e.contexts.length,2);assert.equal(old.closed,1);assert.equal(old.onstatechange,null);
 e.ctx.withAudio(()=>played++);assert.equal(e.requests.length,1);e.requests[0].finish();await flush();assert.equal(played,52);
 assert.equal(e.root.listeners.get('click').size,0);
 before=e.reads;for(let i=0;i<50;i++)e.ctx.withAudio(()=>played++);assert.equal(e.reads,before);assert.equal(e.contexts.length,2);
 // A hanging old resume cannot block or modify the replacement context.
 e.change('interrupted');e.window.fire('pageshow');const stale=e.requests.at(-1);
 leave(e);returnToGame(e);e.root.fire('click');const fresh=e.ctx.ac;assert.notEqual(fresh,old);assert.equal(e.contexts.length,3);
 e.requests.at(-1).finish();await flush();stale.finish();await flush();assert.equal(e.ctx.ac,fresh);assert.equal(e.root.listeners.get('click').size,0);
 // A rejected resume retries on click without another context replacement.
 e.change('interrupted');e.window.fire('pageshow');e.requests.at(-1).fail();await flush();const count=e.contexts.length;
 e.root.fire('click');e.requests.at(-1).finish();await flush();assert.equal(e.contexts.length,count);
 // A gesture supersedes a pending foreground attempt once; rapid clicks share it.
 e.change('suspended');e.window.fire('pageshow');const attempts=e.requests.length;
 e.root.fire('click');e.root.fire('click');assert.equal(e.requests.length,attempts+1);e.requests.at(-1).finish();await flush();
 // Background/pagehide never creates an audio context for a silent/unstarted game.
 e=setup();leave(e);e.window.fire('pagehide');returnToGame(e);e.root.fire('click');assert.equal(e.contexts.length,0);
 e.ctx.context();leave(e);returnToGame(e);e.ctx.cfg.sound=false;e.root.fire('click');e.ctx.withAudio(()=>{});assert.equal(e.contexts.length,1);
 e.ctx.cfg.sound=true;e.ctx.resumeAudio(true);assert.equal(e.contexts.length,2);
 // bfcache return renews once, and decoded AudioBuffers remain reusable.
 e=setup();e.ctx.context();e.window.fire('pageshow',{persisted:true});const buffer={decoded:true};
 e.root.fire('click');e.ctx.recorded(28,{m:60},buffer);e.requests.at(-1).finish();await flush();
 assert.equal(e.sources.length,1);assert.equal(e.sources[0].buffer,buffer);assert.equal(e.sources[0].context,e.ctx.ac);assert(e.sources[0].started);
 // Initial suspension merges requests, and canceled/obsolete sounds never play.
 e=setup('suspended');played=0;e.ctx.withAudio(()=>played++);e.ctx.withAudio(()=>played++);assert.equal(e.requests.length,1);e.requests[0].finish();await flush();assert.equal(played,1);
 for(const cancel of [x=>x.ctx.q={},x=>x.ctx.cfg.sound=false,leave,x=>x.tick()]){
  e=setup('suspended');played=0;e.ctx.withAudio(()=>played++);cancel(e);e.requests[0].finish();await flush();assert.equal(played,0);
 }
 e=setup('interrupted');e.ctx.context();e.ctx.ac.resume=()=>{throw Error('not allowed')};e.root.fire('click');assert.equal(e.root.listeners.get('click').size,1);
 console.log('Audio tests passed: one context renewal per background return, frozen-running and interrupted states, stale promises, decoded-buffer reuse, gesture recovery, mute, cancellation, and no per-note state reads.');
})().catch(error=>{console.error(error);process.exitCode=1});
