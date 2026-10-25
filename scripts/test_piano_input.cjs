// Tests real pitch estimation and capture lifecycle without network or microphone.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('shared/music/piano-input.js','utf8');
const window={};vm.runInNewContext(code,{window});
for(const rate of [44100,48000])for(let midi=21;midi<=108;midi++){
 const hz=440*2**((midi-69)/12);
 for(const cents of [-20,0,20]){
  const f=hz*2**(cents/1200),data=Float32Array.from({length:8192},(_,i)=>.12*Math.sin(2*Math.PI*f*i/rate)+.06*Math.sin(4*Math.PI*f*i/rate)+.02*Math.sin(6*Math.PI*f*i/rate));
  const p=window.ArcadePianoInput.detect(data,rate);
  assert(p,'missing pitch '+midi);assert.equal(p.midi,midi);assert(Math.abs(p.cents-cents)<10,'cents '+midi);
 }
}
assert.equal(window.ArcadePianoInput.detect(new Float32Array(8192),48000),null);
const quiet=Float32Array.from({length:8192},(_,i)=>.0006*Math.sin(2*Math.PI*440*i/48000));
assert.equal(window.ArcadePianoInput.detect(quiet,48000),null);
assert.equal(window.ArcadePianoInput.detect(quiet,48000,{minRms:window.ArcadePianoInput.sensitivityThresholds.high}).midi,69);
let seed=1;const noise=Float32Array.from({length:8192},()=>{seed=(seed*1664525+1013904223)>>>0;return .15*(seed/2**32-.5)});
assert.equal(window.ArcadePianoInput.detect(noise,48000),null);
(async()=>{
 let resolve,stops=0,requests=0;
 const window={cancelAnimationFrame(){}},document={hidden:false,addEventListener(){},removeEventListener(){}};
 const navigator={mediaDevices:{getUserMedia(){requests++;return new Promise(r=>resolve=r)}}};
 vm.runInNewContext(code,{window,document,navigator});
 const states=[],input=window.ArcadePianoInput.create({onState:(s,d)=>states.push([s,d])});
 assert.equal(requests,0);const pending=input.start();assert.equal(requests,1);
 input.stop();resolve({getTracks:()=>[{stop(){stops++}}]});await pending;
 assert.equal(stops,1);assert(!states.some(([s])=>s==='listening'));
 navigator.mediaDevices.getUserMedia=async()=>{throw {name:'NotAllowedError'}};
 await input.start();assert.equal(states.at(-1)[0],'error');assert(states.at(-1)[1].includes('permission'));
 console.log('Piano input passed: 88 synthetic pitches at 44.1/48 kHz, detuning, quiet input, noise, explicit permission, cancellation and denial.');
})().catch(e=>{console.error(e);process.exitCode=1});
