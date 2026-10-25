// Monophonic microphone input. No game rules, recording uploads or dependencies.
// MIDI uses A4=440 Hz. A stable note emits once; release or a new pitch rearms it.
(()=>{'use strict';
function detect(samples,rate,{minHz=25,maxHz=4300,minRms=.012}={}){
 let mean=0;for(const x of samples)mean+=x;mean/=samples.length;
 const n=Math.floor(samples.length/2),d=new Float32Array(n);let power=0;
 for(const x of samples)power+=(x-mean)**2;
 const rms=Math.sqrt(power/samples.length);if(rms<minRms)return null;
 const lo=Math.max(2,Math.floor(rate/maxHz)),hi=Math.min(n-2,Math.ceil(rate/minHz));
 // YIN cumulative mean normalized difference; first strong minimum avoids
 // selecting a lower octave solely because its correlation is slightly better.
 let sum=0;d[0]=1;
 for(let tau=1;tau<=hi+1;tau++){
  let v=0;for(let j=0;j<n;j++){const a=samples[j]-samples[j+tau];v+=a*a}
  sum+=v;d[tau]=sum?v*tau/sum:1;
 }
 let t=lo;for(;t<=hi;t++)if(d[t]<.12){while(t<hi&&d[t+1]<d[t])t++;break}
 if(t>hi)return null;
 const a=d[t-1],b=d[t],c=d[t+1],den=2*(a-2*b+c);
 const period=t+(den?(a-c)/den:0),frequency=rate/period;
 if(frequency<minHz||frequency>maxHz)return null;
 const pitch=69+12*Math.log2(frequency/440),midi=Math.round(pitch);
 return {frequency,midi,cents:100*(pitch-midi),confidence:1-b,rms};
}
function create({onNote=()=>{},onState=()=>{},onLevel=()=>{},minRms=.012}={}){
 let stream,context,source,analyser,frame,epoch=0,live=false,candidate=null,since=0,last=null,quiet=0;
 function reset(){candidate=null;last=null;since=0;quiet=0}
 function stop(){epoch++;live=false;window.cancelAnimationFrame?.(frame);stream?.getTracks().forEach(t=>t.stop());source?.disconnect();if(context)context.close().catch(()=>{});stream=context=source=analyser=null;reset();onState('stopped')}
 async function start(){
  stop();const token=epoch;onState('requesting');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone needs HTTPS and a supported browser.');
   const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
   if(token!==epoch){s.getTracks().forEach(t=>t.stop());return}
   stream=s;context=new (window.AudioContext||window.webkitAudioContext)();await context.resume();
   if(token!==epoch)return;
   source=context.createMediaStreamSource(stream);analyser=context.createAnalyser();analyser.fftSize=8192;source.connect(analyser);live=true;
   const data=new Float32Array(analyser.fftSize);onState('listening');
   let previous=0;
   function tick(now){
    if(!live)return;frame=requestAnimationFrame(tick);if(now-previous<70)return;previous=now;
    analyser.getFloatTimeDomainData(data);let rms=0;for(const x of data)rms+=x*x;rms=Math.sqrt(rms/data.length);onLevel(rms);
    if(rms<minRms){if(!quiet)quiet=now;if(now-quiet>250)reset();candidate=null;return}quiet=0;
    const p=detect(data,context.sampleRate,{minRms});
    if(!p||Math.abs(p.cents)>35){candidate=null;return}
    if(candidate!==p.midi){candidate=p.midi;since=now;return}
    if(now-since>=200&&last!==p.midi){last=p.midi;onNote(p)}
   }
   frame=requestAnimationFrame(tick);
  }catch(e){if(token!==epoch)return;stop();onState('error',e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in your browser settings, then try again.':e.message)}
 }
 const hide=()=>{if(document.hidden)stop()};document.addEventListener('visibilitychange',hide);
 return {start,stop,reset,setThreshold(value){if(Number.isFinite(value)&&value>=.0001&&value<=.1){minRms=value;reset()}},destroy(){stop();document.removeEventListener('visibilitychange',hide)}};
}
window.ArcadePianoInput=Object.freeze({detect,create});
})();
