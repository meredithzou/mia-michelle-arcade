// Reproduce iPad's playback-only capture rejection and test the real modules'
// session handoff. AudioSession and hardware are simulated, not an iPad test.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function setup(){
 let stopped=0;
 class Audio{
  state='running';currentTime=0;destination={};
  resume(){return Promise.resolve()}close(){return Promise.resolve()}
  createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
  createOscillator(){return {frequency:{},connect(){},start(){},stop(){}}}
  createMediaStreamSource(){return {connect(){},disconnect(){}}}
  createAnalyser(){return {fftSize:0,getFloatTimeDomainData(){}}}
 }
 const window={AudioContext:Audio,addEventListener(){},cancelAnimationFrame(){}},document={hidden:false,addEventListener(){},removeEventListener(){}},navigator={audioSession:{type:'auto'},mediaDevices:{
  async getUserMedia(){
   if(navigator.audioSession&&!['auto','play-and-record'].includes(navigator.audioSession.type))throw Object.assign(Error('AudioSession category is not compatible with audio capture'),{name:'InvalidStateError'});
   return {getTracks:()=>[{stop(){stopped++}}]};
  }
 }};
 const ctx={window,document,navigator,requestAnimationFrame:()=>1,setTimeout,clearTimeout,AbortController};vm.createContext(ctx);
 vm.runInContext(read('shared/music/audio.js'),ctx);vm.runInContext(read('shared/music/piano-input.js'),ctx);
 const root={addEventListener(){},removeEventListener(){}},makeAudio=()=>window.ArcadeMusicAudio.create({root,isEnabled:()=>true,getQuestion:()=>null});
 return {navigator,window,makeAudio,get stopped(){return stopped}};
}
(async()=>{
 const e=setup();e.makeAudio().wrong();assert.equal(e.navigator.audioSession.type,'playback');
 await assert.rejects(e.navigator.mediaDevices.getUserMedia(),/category is not compatible/);
 const states=[],a=e.window.ArcadePianoInput.create({onState:(s,d)=>states.push([s,d])});
 await a.start();assert.equal(states.at(-1)[0],'listening');assert.equal(e.navigator.audioSession.type,'play-and-record');
 // New or recovered playback contexts cannot force an active mic to playback-only.
 e.makeAudio().wrong();assert.equal(e.navigator.audioSession.type,'play-and-record');
 const b=e.window.ArcadePianoInput.create();await b.start();a.stop();assert.equal(e.navigator.audioSession.type,'play-and-record');
 b.stop();assert.equal(e.navigator.audioSession.type,'playback');assert.equal(e.stopped,2);
 a.stop();assert.equal(e.navigator.audioSession.type,'playback','Repeated stops are idempotent');
 e.navigator.mediaDevices.getUserMedia=async()=>{throw {name:'NotAllowedError'}};
 await a.start();assert.equal(states.at(-1)[0],'error');assert.equal(e.navigator.audioSession.type,'playback');
 let resolve;e.navigator.mediaDevices.getUserMedia=()=>new Promise(r=>resolve=r);
 const pending=a.start();assert.equal(e.navigator.audioSession.type,'play-and-record');a.stop();assert.equal(e.navigator.audioSession.type,'playback');
 resolve({getTracks:()=>[{stop(){}}]});await pending;assert.equal(e.navigator.audioSession.type,'playback');
 const plain=setup();delete plain.navigator.audioSession;const plainStates=[];
 await plain.window.ArcadePianoInput.create({onState:s=>plainStates.push(s)}).start();assert.equal(plainStates.at(-1),'listening');
 console.log('Audio session passed: reproduced exact playback-only rejection, capture handoff, playback guard, multiple inputs, stop/denial/cancellation restoration and unsupported API.');
})().catch(e=>{console.error(e);process.exitCode=1});
