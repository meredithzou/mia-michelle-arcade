// Run with: node scripts/test_name_the_note_audio.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../games',process.argv[2]||'name-the-note','index.html'),'utf8');
const code=html.slice(html.indexOf('// Recovery is event-driven.'),html.indexOf('const PIANO_SOURCE='));
class Events{
 constructor(){this.listeners=new Map()}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn)}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn)}
 fire(type){for(const fn of [...(this.listeners.get(type)||[])])fn()}
}
function setup(initial='running'){
 let state=initial,reads=0,resumes=0,created=0,resolve,reject,now=0;
 const root=new Events(),document=new Events(),window=new Events();document.hidden=false;
 class Audio{
  constructor(){created++}
  get state(){reads++;return state}
  currentTime=0;
  destination={};
  createGain(){return {gain:{value:0},connect(){}}}
  resume(){resumes++;return new Promise((ok,bad)=>{resolve=()=>{state='running';this.onstatechange();ok()};reject=bad})}
 }
 window.AudioContext=Audio;
 const ctx={root,document,window,navigator:{},cfg:{sound:true},q:{},ac:null,bus:null,activeSounds:new Set(),Promise,Date:{now:()=>now}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 return {ctx,root,document,window,change(next){state=next;ctx.ac.onstatechange()},finish(){resolve()},fail(){reject(Error('gesture needed'))},tick(){now+=1100},get reads(){return reads},get resumes(){return resumes},get created(){return created}};
}
async function flush(){for(let i=0;i<8;i++)await Promise.resolve()}
(async()=>{
 let e=setup(),played=0;e.ctx.withAudio(()=>played++);
 const before=e.reads;for(let i=0;i<50;i++)e.ctx.withAudio(()=>played++);
 assert.equal(e.reads,before);assert.equal(e.resumes,0);assert.equal(e.created,1);assert.equal(played,51);
 let stopped=0;e.ctx.activeSounds.add(()=>stopped++);e.change('interrupted');assert.equal(stopped,1);
 e.document.hidden=true;e.document.fire('visibilitychange');assert.equal(e.resumes,0);
 e.document.hidden=false;e.document.fire('visibilitychange');e.window.fire('pageshow');assert.equal(e.resumes,1);
 e.finish();await flush();assert.equal(e.root.listeners.get('click').size,0);
 e.ctx.withAudio(()=>played++);assert.equal(played,52);assert.equal(e.created,1);
 // A rejected foreground resume is retried during a subsequent user click.
 e.change('interrupted');e.window.fire('pageshow');e.fail();await flush();assert.equal(e.root.listeners.get('click').size,1);
 e.root.fire('click');e.finish();await flush();assert.equal(e.root.listeners.get('click').size,0);
 // A gesture can supersede a hanging foreground attempt exactly once.
 e.change('interrupted');e.window.fire('pageshow');const attempts=e.resumes;
 e.root.fire('click');e.root.fire('click');assert.equal(e.resumes,attempts+1);
 e.finish();await flush();assert.equal(e.root.listeners.get('click').size,0);
 // Initial autoplay suspension: one recovery, only the most recent sound plays.
 e=setup('suspended');played=0;e.ctx.withAudio(()=>played++);e.ctx.withAudio(()=>played++);assert.equal(e.resumes,1);assert.equal(played,0);e.finish();await flush();assert.equal(played,1);
 // Do not replay sounds for a different question, while muted, hidden, or stale.
 for(const cancel of [x=>x.ctx.q={},x=>x.ctx.cfg.sound=false,x=>{x.document.hidden=true;x.document.fire('visibilitychange')},x=>x.tick()]){
  e=setup('suspended');played=0;e.ctx.withAudio(()=>played++);cancel(e);e.finish();await flush();assert.equal(played,0);
 }
 e=setup();e.ctx.cfg.sound=false;e.ctx.withAudio(()=>{});assert.equal(e.created,0);
 e.ctx.cfg.sound=true;e.ctx.context();e.change('suspended');e.ctx.cfg.sound=false;e.window.fire('pageshow');assert.equal(e.resumes,0);
 // API exceptions stay contained; rejected resumes never create a retry loop.
 e=setup('interrupted');e.ctx.context();e.ctx.ac.resume=()=>{throw Error('not allowed')};e.root.fire('click');assert.equal(e.root.listeners.get('click').size,1);
 console.log('Audio recovery tests passed: interrupted/suspended, foreground, gesture retry, request deduplication, stale-sound cancellation, mute, and no per-note state reads.');
})().catch(error=>{console.error(error);process.exitCode=1});
