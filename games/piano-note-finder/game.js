'use strict';
const $=id=>document.getElementById(id),sharp=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],flat={1:'D♭',3:'E♭',6:'G♭',8:'A♭',10:'B♭'};
const preferences=window.ArcadeSettings.create({
 key:'arcade.settings.piano-note-finder',version:1,defaults:{sensitivity:window.ArcadePianoInput.defaultSensitivity},
 normalize:(value,defaults)=>({sensitivity:Object.hasOwn(window.ArcadePianoInput.sensitivityThresholds,value.sensitivity)?value.sensitivity:defaults.sensitivity})
});
const saved=preferences.load(),thresholds=window.ArcadePianoInput.sensitivityThresholds;
let state='stopped',threshold=thresholds[saved.sensitivity],lastLevel=0;
const db=rms=>rms>0?Math.max(-100,Math.round(20*Math.log10(rms))):-100;
const input=ArcadePianoInput.create({
 minRms:threshold,
 onState(s,detail){
  state=s;const active=s==='listening',busy=s==='requesting';
  $('toggle').disabled=busy;$('toggle').setAttribute('aria-pressed',String(active));
  $('togglelabel').textContent=active?'Stop':busy?'Allow mic…':'Listen';
  $('status').textContent=active?'Microphone on':busy?'Allow microphone access':s==='error'?'Microphone unavailable':'Microphone off';
  $('prompt').textContent=detail||'Play a piano key and check its name.';
  if(!active){$('live').textContent='— dBFS';$('level').value=0}
 },
 onLevel(rms){
  if(performance.now()-lastLevel<90)return;lastLevel=performance.now();
  $('live').textContent=db(rms)+' dBFS';$('level').value=Math.min(1,Math.max(0,(db(rms)+80)/60));
 },
 onNote(p){
  const pc=(p.midi%12+12)%12,octave=Math.floor(p.midi/12)-1;
  $('note').textContent=sharp[pc]+octave;
  $('alternate').textContent=flat[pc]?'also '+flat[pc]+octave:'';
  $('frequency').textContent=p.frequency.toFixed(1)+' Hz';$('notevolume').textContent=db(p.rms)+' dBFS';
 }
});
$('toggle').onclick=()=>state==='listening'?input.stop():input.start();
const sensitivityButtons=[];
for(const {id,label} of window.ArcadePianoInput.sensitivityOptions){
 const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.sensitivity=id;
 button.setAttribute('aria-pressed',String(id===saved.sensitivity));
 button.onclick=()=>{
  threshold=thresholds[id];input.setThreshold(threshold);preferences.save({sensitivity:id});
  for(const b of sensitivityButtons)b.setAttribute('aria-pressed',String(b===button));
 };
 sensitivityButtons.push(button);$('sensitivityoptions').append(button);
}
window.addEventListener('pagehide',()=>input.stop());
