// Shared Salamander piano engine. Pitch inputs are MIDI numbers.
// Preserves main's event-driven background/context recovery (PR #22).
(()=>{'use strict';
function create({root,isEnabled,getQuestion,onStateChange=()=>{}}){
let ac,bus;
const activeSounds=new Set(),notify=()=>onStateChange();
// Recovery is event-driven. Normal note playback only tests a cached flag.
let audioNeedsResume=false,audioNeedsFreshContext=false,audioResumePending=null,audioGestureArmed=false,audioRequest=0;
function stopPracticeSounds(){for(const stop of activeSounds)stop();activeSounds.clear()}
function armAudioGesture(armed){
 if(armed===audioGestureArmed)return;
 audioGestureArmed=armed;
 if(armed)root.addEventListener('click',resumeOnAudioGesture,true);
 else root.removeEventListener('click',resumeOnAudioGesture,true);
}
function audioStateChanged(){
 if(!ac)return;
 audioNeedsResume=ac.state==='suspended'||ac.state==='interrupted';
 if(ac.state==='closed')audioNeedsFreshContext=true;
 armAudioGesture(audioNeedsResume||audioNeedsFreshContext);
 if(ac.state==='interrupted'){audioRequest++;stopPracticeSounds()}
}
function resumeAudio(gesture=false){
 if(!ac||!isEnabled()||document.hidden)return null;
 if(audioNeedsFreshContext){
  if(!gesture)return null;
  if(!context(true))return null;
 }
 if(!audioNeedsResume)return null;
 // A foreground attempt may stay pending until user activation. Allow one
 // gesture-backed attempt to supersede it; further clicks share that attempt.
 if(audioResumePending&&(!gesture||audioResumePending.gesture))return audioResumePending.promise;
 try{
  // Invoke resume synchronously inside the click when a user gesture is needed.
  const current=ac,attempt={gesture};
  attempt.promise=Promise.resolve(current.resume()).catch(()=>{}).then(()=>{
   if(ac!==current)return;
   if(audioResumePending===attempt)audioResumePending=null;
   audioStateChanged();
  });
  audioResumePending=attempt;return attempt.promise;
 }catch{audioStateChanged();return null}
}
function resumeOnAudioGesture(){resumeAudio(true)}
function restorePageAudio(){if(ac){audioStateChanged();resumeAudio()}}
function leavePageAudio(){
 audioRequest++;stopPracticeSounds();
 // On iOS a backgrounded context can remain stuck even while reporting running.
 // Retire it once, in the next foreground user gesture; keep decoded samples.
 if(ac){audioNeedsFreshContext=true;armAudioGesture(true)}
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)leavePageAudio();else restorePageAudio();
});
window.addEventListener('pagehide',leavePageAudio);
window.addEventListener('pageshow',event=>{
 if(event.persisted&&ac){audioNeedsFreshContext=true;armAudioGesture(true)}
 restorePageAudio();
});
function retireAudioContext(){
 const previous=ac;
 previous.onstatechange=null;audioRequest++;stopPracticeSounds();
 try{bus.disconnect()}catch{}
 ac=null;bus=null;audioResumePending=null;
 // Do not await close: user activation must reach the new context synchronously.
 try{Promise.resolve(previous.close()).catch(()=>{})}catch{}
}
function context(gesture=false){try{
 if(ac&&gesture&&audioNeedsFreshContext)retireAudioContext();
 if(!ac){
 // Treat practice sounds as media so supported iPhones can play in Silent Mode.
 try{if('audioSession' in navigator)navigator.audioSession.type='playback'}catch{}
 ac=new(window.AudioContext||window.webkitAudioContext)();
 bus=ac.createGain();bus.gain.value=isEnabled()?.48:0;bus.connect(ac.destination);
 audioNeedsFreshContext=false;ac.onstatechange=audioStateChanged;audioStateChanged();
}return ac}catch{return null}}
function withAudio(action){
 if(!isEnabled()||document.hidden)return;
 const a=context(true);if(!a)return;
 const ticket=++audioRequest;
 if(!audioNeedsResume){action(a);return}
 const question=getQuestion(),requested=Date.now();
 const pending=resumeAudio(true);
 if(pending)pending.then(()=>{
  // Never replay a previous question or an old sound after a long interruption.
  if(a===ac&&ticket===audioRequest&&question===getQuestion()&&isEnabled()&&!document.hidden&&
     !audioNeedsResume&&Date.now()-requested<1000)action(a);
 });
}
function trackPracticeSound(source){
 const stop=()=>{try{source.stop()}catch{}};
 activeSounds.add(stop);source.onended=()=>activeSounds.delete(stop);
}
const PIANO_SOURCE={layer:'v8',version:'1.0.5',baseUrl:'https://cdn.jsdelivr.net/npm/@audio-samples/piano-mp3-velocity8@1.0.5/audio/'};
function pianoURL(r){return PIANO_SOURCE.baseUrl+encodeURIComponent(r.file.replace(/^Ds/,'D#').replace(/^Fs/,'F#').replace(/\.mp3$/,'v8.mp3'))}
const roots=[];for(let o=1;o<=6;o++)for(let [k,n] of [['C',0],['Ds',3],['Fs',6],['A',9]])roots.push({m:12*(o+1)+n,file:k+o+'.mp3'});roots.push({m:21,file:'A0.mp3'},{m:96,file:'C7.mp3'});const cache=new Map(),loading=new Map(),nearest=m=>roots.reduce((a,b)=>Math.abs(a.m-m)<=Math.abs(b.m-m)?a:b,roots[0]);
const pianoFailed=new Set();
let pianoDecoder;
function sample(r){
 if(cache.has(r.file))return Promise.resolve(cache.get(r.file));
 if(loading.has(r.file))return loading.get(r.file);
 if(pianoFailed.has(r.file))return Promise.resolve(null);
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
 const p=fetch(pianoURL(r),{signal:ctrl.signal,mode:'cors'})
 .then(x=>{if(!x.ok)throw Error('Piano recording unavailable');return x.arrayBuffer()})
 .then(bytes=>{if(!pianoDecoder){const Decoder=window.OfflineAudioContext||window.webkitOfflineAudioContext;pianoDecoder=Decoder?new Decoder(2,1,44100):context()}if(!pianoDecoder)throw Error('Audio decoding unavailable');return pianoDecoder.decodeAudioData(bytes)})
 .then(b=>{cache.set(r.file,b);pianoFailed.delete(r.file);return b})
 .catch(()=>{pianoFailed.add(r.file);return null})
 .finally(()=>{clearTimeout(timeout);loading.delete(r.file);notify()});
 loading.set(r.file,p);return p;
}
function recorded(m,r,b){withAudio(a=>{let s=a.createBufferSource(),g=a.createGain(),t=a.currentTime;s.buffer=b;s.playbackRate.value=Math.pow(2,(m-r.m)/12);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.5,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+2);s.connect(g);g.connect(bus);s.start(t);s.stop(t+2.05);trackPracticeSound(s)})}
function play(m){if(!isEnabled())return;let r=nearest(m),b=cache.get(r.file);if(b)recorded(m,r,b);else{sample(r);notify()}}
function wrong(){withAudio(a=>{let t=a.currentTime;for(let [d,hz] of [[0,247],[.12,196]]){let o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.00001,t+d);g.gain.linearRampToValueAtTime(.055,t+d+.015);g.gain.exponentialRampToValueAtTime(.00001,t+d+.18);o.connect(g);g.connect(bus);o.start(t+d);o.stop(t+d+.19);trackPracticeSound(o)}})}

function samplesFor(pitches){
 const unique=new Map();for(const m of pitches){const r=nearest(m);unique.set(r.file,r)}return [...unique.values()];
}
function readiness(pitches){
 const rs=samplesFor(pitches),done=rs.filter(r=>cache.has(r.file)).length;
 const busy=rs.some(r=>loading.has(r.file));
 return {rs,done,total:rs.length,state:done===rs.length?'ready':!busy&&rs.some(r=>pianoFailed.has(r.file))?'error':'loading'};
}
function prepare(pitches,priority=null){
 if(!isEnabled()){notify();return}
 const rs=samplesFor(pitches);
 if(priority!==null){const first=nearest(priority).file;rs.sort((a,b)=>(a.file===first?-1:0)-(b.file===first?-1:0))}
 for(const r of rs)if(!cache.has(r.file)&&!pianoFailed.has(r.file))sample(r);
 notify();
}
function retry(pitches){for(const r of samplesFor(pitches))pianoFailed.delete(r.file);prepare(pitches)}
function setEnabled(enabled){
 audioRequest++;if(!enabled)stopPracticeSounds();else resumeAudio(true);
 if(bus)bus.gain.value=enabled?.48:0;
}
function stop(){audioRequest++;stopPracticeSounds()}
return Object.freeze({stop,play,wrong,samplesFor,readiness,prepare,retry,setEnabled});
}
window.ArcadeMusicAudio=Object.freeze({create});
})();
