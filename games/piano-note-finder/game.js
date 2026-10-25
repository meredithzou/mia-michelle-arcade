'use strict';
const $=id=>document.getElementById(id),sharp=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'],flat={1:'D♭',3:'E♭',6:'G♭',8:'A♭',10:'B♭'};
const preferences=window.ArcadeSettings.create({
 key:'arcade.settings.piano-note-finder',version:1,defaults:{sensitivity:'standard'},
 normalize:(value,defaults)=>({sensitivity:['low','standard','high'].includes(value.sensitivity)?value.sensitivity:defaults.sensitivity})
});
const saved=preferences.load(),thresholds={low:.012,standard:.003,high:.001};
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
for(const button of document.querySelectorAll('[data-threshold]'))button.onclick=()=>{
 threshold=Number(button.dataset.threshold);input.setThreshold(threshold);
 preferences.save({sensitivity:Object.keys(thresholds).find(k=>thresholds[k]===threshold)});
 for(const b of document.querySelectorAll('[data-threshold]'))b.setAttribute('aria-pressed',String(b===button));
};
window.addEventListener('pagehide',()=>input.stop());

for(const b of document.querySelectorAll('[data-threshold]'))b.setAttribute('aria-pressed',String(Number(b.dataset.threshold)===threshold));
