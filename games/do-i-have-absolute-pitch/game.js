// Listening-to-keyboard practice. Audio, keyboard rendering, styling and storage are shared.
(()=>{'use strict';
const root=document.getElementById('npx');if(root.dataset.ready)return;root.dataset.ready='1';
const $=id=>root.querySelector('#'+id);
const pianoInput=window.ArcadePianoInput;
const init={range:'upper',hints:true,sensitivity:pianoInput.defaultSensitivity,selectedByRange:{
 lower:Array.from({length:36},(_,i)=>36+i),middle:Array.from({length:36},(_,i)=>48+i),upper:Array.from({length:36},(_,i)=>60+i)
}};
const practiceSettings=window.ArcadeSettings.create({
 key:'arcade.settings.do-i-have-absolute-pitch',version:5,defaults:init,
 upgrade:(version,value)=>{
  if(version===3||version===4){
   const selectedByRange={...value.selectedByRange};
   for(const [range,lo] of [['lower',36],['middle',48],['upper',60]]){
    const notes=selectedByRange[range];
    // Earlier full-range presets contained 25 keys. Upgrade only that exact
    // selection; sparse/custom selections and current three-octave pools stay.
    if(Array.isArray(notes)&&notes.length===25&&new Set(notes).size===25&&notes.every(m=>Number.isInteger(m)&&m>=lo&&m<=lo+24)){
     selectedByRange[range]=[...init.selectedByRange[range]];
    }
   }
   return {...value,selectedByRange};
  }
  if(![1,2].includes(version))return null;
  const selectedByRange={};
  for(const [range,lo] of [['lower',36],['middle',48],['upper',60]])selectedByRange[range]=Array.from({length:36},(_,i)=>lo+i).filter(m=>value.notes!=='white'||![1,3,6,8,10].includes(m%12));
  return {...value,hints:version===1?true:value.hints,selectedByRange};
 },
 normalize:(value,defaults)=>{
  const selectedByRange={};
  for(const [range,lo] of [['lower',36],['middle',48],['upper',60]]){
   const saved=value.selectedByRange?.[range];
   const notes=Array.isArray(saved)?[...new Set(saved.filter(m=>Number.isInteger(m)&&m>=lo&&m<=lo+35))].sort((a,b)=>a-b):[];
   selectedByRange[range]=Array.isArray(saved)?notes:[...defaults.selectedByRange[range]];
  }
  const range=['middle','upper','lower'].includes(value.range)?value.range:defaults.range;
  if(!selectedByRange[range].length)selectedByRange[range]=[...defaults.selectedByRange[range]];
  return {range,sensitivity:Object.hasOwn(pianoInput.sensitivityThresholds,value.sensitivity)?value.sensitivity:defaults.sensitivity,
   hints:typeof value.hints==='boolean'?value.hints:defaults.hints,selectedByRange};
 }
});
let cfg=practiceSettings.load(),draft,q,bag=[],last=null,total=0,correct=0,judged=false,locked=false,heard=false,started=false,pending=false,timer,lastAttempt=null,playback=0;
const attempts=new Set();
const motion=window.ArcadePitchPlayback.create({root,button:$('pitchplay')});
const audio=window.ArcadeMusicAudio.create({root,isEnabled:()=>true,getQuestion:()=>q,onStateChange:renderPianoState});
const keys=window.PlayThatNoteKeyboard.create({container:$('npxletters'),onAnswer:m=>{if(!pianoMode)answer(m)}});
let pianoMode=false,micActive=false,acceptMic=false,speakerBusy=false,micTimer,micError='';
const inputButton=document.createElement('button');inputButton.id='pitchinput';inputButton.className='npx-icon-button';
const microphoneIcon='<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>';
$('npxsettings').before(inputButton);
const micStatus=document.createElement('span');micStatus.className='pitch-input-status';micStatus.setAttribute('role','status');micStatus.setAttribute('aria-live','polite');
$('npxpianoState').before(micStatus);
const inputHint=document.createElement('p');inputHint.className='pitch-input-hint';
inputHint.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+microphoneIcon+'</svg>Turn the microphone on to play a physical piano, or leave it off to tap the on-screen piano keys.';
$('npxmsg').after(inputHint);
const privacy=document.createElement('p');privacy.className='pitch-privacy';privacy.innerHTML='<strong>Privacy:</strong> Microphone audio is processed entirely on the device. It is never recorded, stored, or uploaded to a server.';root.after(privacy);
const resources=document.createElement('section');resources.className='pitch-resources';resources.setAttribute('aria-label','Learning guide and experimental sound notice');
resources.innerHTML='<section class="pitch-experiment"><h2>About the Sound</h2><p><strong>Note:</strong> Sound playback is experimental and best effort. Pitch accuracy is not guaranteed. Users should verify sounds independently before relying on them.</p><details><summary>Sound source, processing &amp; limitations</summary><p>We use <a href="https://github.com/sfzinstruments/SalamanderGrandPiano" target="_blank" rel="noopener">Salamander Grand Piano V3</a> recordings by Alexander Holm (<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>), MP3 velocity layer 8, collection v1.0.5. A nearby recording is played at an adjusted rate to generate each key, with a volume envelope. We do not run the full SFZ instrument or apply its tuning adjustments.</p><p>The mapping targets A4 = 440 Hz using twelve-tone equal-temperament ratios; this does not measure or certify the recordings’ actual tuning. We have not independently verified every rendered note’s frequency. Recording, playback and microphone detection errors may occur.</p><p>Users are responsible for assessing suitability and choosing whether to rely on these sounds.</p></details></section><section class="pitch-guide-link"><div><small>Practicing Absolute Pitch</small><h2>OUR FAMILY LEARNING NOTEBOOK</h2><p>Research, illustrated examples, and a step-by-step exploration.</p></div><a href="learn.html">Read the guide →</a></section>';
root.after(resources);
const sensitivityHeading=document.createElement('h3');sensitivityHeading.textContent='Microphone sensitivity';
const sensitivityOptions=document.createElement('div');sensitivityOptions.className='npx-sounds';sensitivityOptions.setAttribute('role','group');sensitivityOptions.setAttribute('aria-label','Microphone sensitivity');
const micHelp=document.createElement('p');micHelp.className='pitch-input-help';micHelp.textContent='Play one note at a time. Higher sensitivity hears quieter notes and more background noise. Microphone audio stays on the device.';
$('npxloadpanel').before(sensitivityHeading,sensitivityOptions,micHelp);
const mic=pianoInput.create({minRms:pianoInput.sensitivityThresholds[cfg.sensitivity],
 onState:(state,detail)=>{micActive=state==='listening';if(state==='error'){pianoMode=false;acceptMic=false;micError=detail||'Microphone unavailable. Please try again.'}inputUI()},
 onNote:p=>{if(pianoMode&&micActive&&acceptMic&&!speakerBusy&&!locked&&heard&&$('npxshade').hidden)answer(p.midi)}
});
function inputUI(){
 inputButton.setAttribute('aria-label',pianoMode?'Turn microphone off':'Turn microphone on');inputButton.setAttribute('aria-pressed',String(pianoMode));
 inputButton.innerHTML='<svg class="npx-icon-roomy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+microphoneIcon+(!pianoMode?'<path d="M3 3l18 18"/>':'')+'</svg>';
 for(const key of $('npxletters').children)key.disabled=pianoMode||locked;
 micStatus.textContent=micError||(!pianoMode?'Microphone off':speakerBusy?'Listening paused during playback':micActive?'Microphone on':'Starting microphone…');
}
function inputPrompt(){return pianoMode?'Play the matching piano key on a physical piano':'Tap the matching piano key below'}
function pauseAnswers(){clearTimeout(micTimer);acceptMic=false;mic.reset()}
function resumeAnswers(){pauseAnswers();if(!speakerBusy&&!document.hidden&&$('npxshade').hidden){acceptMic=true;mic.reset()}inputUI()}
inputButton.onclick=()=>{
 micError='';pauseAnswers();mic.stop();pianoMode=!pianoMode;inputUI();
 if(pianoMode){mic.start();if(!speakerBusy)resumeAnswers()}
 if(heard&&!locked&&!speakerBusy)message(inputPrompt());
};
function bounds(c=cfg){return c.range==='lower'?[36,71]:c.range==='upper'?[60,95]:[48,83]}
function candidates(c=cfg){return [...c.selectedByRange[c.range]]}
function keyboardPitches(c=cfg){const [lo,hi]=bounds(c);return Array.from({length:hi-lo+1},(_,i)=>lo+i)}
function copySettings(c){return {...c,selectedByRange:Object.fromEntries(Object.entries(c.selectedByRange).map(([range,notes])=>[range,[...notes]]))}}
function pitch(){
 if(!bag.length){bag=candidates();for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
  if(bag.at(-1)===last){const j=bag.findIndex(m=>m!==last);if(j>=0)[bag[j],bag[bag.length-1]]=[bag.at(-1),bag[j]]}
 }
 last=bag.pop();return last;
}
function message(text,kind=''){$('npxmsg').textContent=text;$('npxmsg').className='npx-msg '+kind}
function endMotion(){motion.stop()}
function startMotion(){motion.start()}
function stop(){pending=false;playback++;pauseAnswers();speakerBusy=false;endMotion();audio.stop();inputUI()}
function playPitch(){
 if(!$('npxshade').hidden)return;
 started=true;stop();
 const status=audio.readiness([q.m]);
 if(status.state!=='ready'){
  pending=true;message(status.state==='error'?'Piano unavailable. Open Settings to retry loading.':'Loading this pitch…');
  audio.prepare(keyboardPitches(),q.m);return;
 }
 const question=q,ticket=playback;
 speakerBusy=true;pauseAnswers();inputUI();
 startMotion();
 audio.play(q.m,()=>{
  if(q!==question||ticket!==playback)return;
  // Keep the capture session alive for iPad, but ignore speaker audio and its tail.
  q.played=true;pitchButton();
  micTimer=setTimeout(()=>{if(q!==question||ticket!==playback)return;speakerBusy=false;resumeAnswers()},350);
 });
 heard=true;
 if(!locked)message(inputPrompt());
}
function pitchButton(){
 $('pitchlabel').textContent=q.played?'Replay Pitch':'Play Pitch';
 $('pitchplay').setAttribute('aria-label',q.played?'Replay the same mystery pitch':'Play the mystery pitch');
}
function next(){
 clearTimeout(timer);stop();locked=judged=heard=false;attempts.clear();lastAttempt=null;q={m:pitch(),played:false};
 const [lo,hi]=bounds();keys.render(lo,hi);
 mic.reset();inputUI();
 $('npxkeyhint').hidden=true;
 $('npxreveal').disabled=false;$('npxnext').hidden=true;pitchButton();
 $('pitchhint').textContent=pianoMode?'Listen, then play the matching piano key on a physical piano':'Listen, then tap the matching piano key';
 message(started?'Listen to the new pitch':'Tap “Play Pitch” to begin');
 if(started)playPitch();
}
function restart(){clearTimeout(timer);started=false;total=correct=0;bag=[];last=null;$('npxnum').textContent='0';$('npxacc').textContent='—';next()}
function grade(ok){if(judged)return;judged=true;total++;if(ok)correct++;$('npxnum').textContent=total;$('npxacc').textContent=Math.round(100*correct/total)+'%'}
function canAnswer(){
 if(locked||!$('npxshade').hidden)return false;
 if(!heard){message('Play the pitch before answering.');return false}return true;
}
function answer(m){
 if(!canAnswer())return;
 stop();if(!pianoMode)audio.play(m);else resumeAnswers();
 const ok=m===q.m;grade(ok);
 if(!ok){attempts.add(m);lastAttempt=m;showHint(m);return}
 locked=true;pauseAnswers();keys.lock(m,'good');inputUI();message('✓ '+keys.name(q.m)+' — correct!','good');
 $('npxreveal').disabled=true;$('npxnext').hidden=false;timer=setTimeout(next,1600);
}
$('pitchplay').onclick=playPitch;
$('npxreveal').onclick=()=>{
 if(!canAnswer())return;grade(false);locked=true;keys.lock(q.m,'show');
 message('Answer: '+keys.name(q.m));$('npxreveal').disabled=true;$('npxnext').hidden=false;playPitch();
};
$('npxnext').onclick=next;$('npxrestart').onclick=restart;
function showHint(m){
 const kind=cfg.hints?(m<q.m?'low':'high'):'bad';
 keys.mark(m,kind);
 message(kind==='low'?'Too low — try a higher key.':kind==='high'?'Too high — try a lower key.':'Not quite. Listen again and try another key.',kind);
}
function hintControl(){
 const b=$('pitchhints');b.setAttribute('aria-pressed',String(cfg.hints));
 b.setAttribute('aria-label',cfg.hints?'Turn hints off':'Turn hints on');
 b.dataset.state=cfg.hints?'on':'off';
}
$('pitchhints').onclick=()=>{
 cfg.hints=!cfg.hints;if(draft)draft.hints=cfg.hints;
 practiceSettings.save(cfg);hintControl();
 if(!locked&&lastAttempt!==null){for(const m of attempts)keys.mark(m,cfg.hints?(m<q.m?'low':'high'):'bad');showHint(lastAttempt)}
};
function choices(id,items,field){
 const container=$(id);container.replaceChildren();
 for(const [value,label] of items){const b=document.createElement('button');b.textContent=label;
 b.className=draft[field]===value?'active':'';b.setAttribute('aria-pressed',String(draft[field]===value));
 b.onclick=()=>{draft[field]=value;settings()};container.append(b)}
}
function settings(){
 sensitivityOptions.replaceChildren();
 for(const {id,label} of pianoInput.sensitivityOptions){const b=document.createElement('button');b.textContent=label;b.className=draft.sensitivity===id?'active':'';b.setAttribute('aria-pressed',String(draft.sensitivity===id));b.onclick=()=>{draft.sensitivity=id;settings()};sensitivityOptions.append(b)}
 choices('pitchranges',[['lower','C2–B4'],['middle','C3–B5'],['upper','C4–B6']],'range');
 renderSelection();renderPianoState();
}
// Same touch keyboard renderer as the answer keyboard; selection is draft-only.
const selectionKeys=window.PlayThatNoteKeyboard.create({container:$('pitchselection'),onAnswer:toggleNote});
function renderSelection(){
 const [lo,hi]=bounds(draft);selectionKeys.render(lo,hi);
 const selected=draft.selectedByRange[draft.range];
 for(const b of $('pitchselection').children){
  const on=selected.includes(Number(b.dataset.midi));
  if(on)b.classList.add('selected');else b.classList.remove('selected');
  b.setAttribute('aria-pressed',String(on));
 }
 $('pitchselectionstatus').setAttribute('role','status');
 $('pitchselectionstatus').classList.remove('pitch-selection-error');
 $('pitchselectionstatus').textContent=selected.length+' notes selected · Tap keys to include or exclude them';
}
function toggleNote(m){
 const notes=draft.selectedByRange[draft.range];
 if(notes.includes(m)){
  draft.selectedByRange[draft.range]=notes.filter(n=>n!==m);
 }else draft.selectedByRange[draft.range]=[...notes,m].sort((a,b)=>a-b);
 renderSelection();
}
$('pitchselectall').onclick=()=>{draft.selectedByRange[draft.range]=keyboardPitches(draft);renderSelection()};
$('pitchselectwhite').onclick=()=>{draft.selectedByRange[draft.range]=keyboardPitches(draft).filter(m=>![1,3,6,8,10].includes(m%12));renderSelection()};
$('pitchselectblack').onclick=()=>{draft.selectedByRange[draft.range]=keyboardPitches(draft).filter(m=>[1,3,6,8,10].includes(m%12));renderSelection()};
$('pitchselectnone').onclick=()=>{draft.selectedByRange[draft.range]=[];renderSelection()};
function closeSettings(){ $('npxshade').hidden=true;pending=false;if(pianoMode)mic.start();resumeAnswers();if(locked)timer=setTimeout(next,1600);$('npxsettings').focus?.() }
$('npxsettings').onclick=()=>{clearTimeout(timer);stop();mic.stop();draft=copySettings(cfg);$('npxshade').hidden=false;settings();$('npxclose').focus?.()};
$('npxclose').onclick=closeSettings;
$('npxreset').onclick=()=>{draft=copySettings(init);settings()};
$('npxapply').onclick=()=>{
 if(!draft.selectedByRange[draft.range].length){
  const status=$('pitchselectionstatus');status.setAttribute('role','alert');status.classList.add('pitch-selection-error');
  status.textContent='Please select at least one note before saving.';return;
 }
 stop();cfg=copySettings(draft);mic.setThreshold(pianoInput.sensitivityThresholds[cfg.sensitivity]);practiceSettings.save(cfg);closeSettings();hintControl();restart();preparePiano()};
$('npxretry').onclick=()=>{audio.retry(keyboardPitches());message('Retrying piano sounds…')};
function renderPianoState(){
 const status=audio.readiness(keyboardPitches()),state=status.state;
 $('npxpianoState').dataset.state=state;
 $('npxpianoState').textContent=state==='ready'?'Piano sounds are ready':state==='error'?'Piano unavailable':'Loading piano sounds…';
 $('npxloaddetail').textContent=$('npxpianoState').textContent;
 $('npxloadcount').textContent=status.done+'/'+status.total;
 $('npxloadprogress').max=status.total;$('npxloadprogress').value=status.done;
 $('npxloadhint').textContent=state==='error'?'Check the connection, then retry loading.':state==='ready'?'Ready to listen.':'Piano recordings are loading. Answers unlock after the pitch has been played.';
 $('npxretry').hidden=state!=='error';
 if(pending&&q&&$('npxshade').hidden&&audio.readiness([q.m]).state==='ready')playPitch();
}
function preparePiano(){audio.prepare(keyboardPitches(),q.m)}
// Pause pending automatic playback when the app goes into the background.
function suspendInput(){clearTimeout(timer);stop();pianoMode=false;mic.stop();inputUI()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendInput()});
window.addEventListener('pagehide',suspendInput);
root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('npxshade').hidden)closeSettings()});
hintControl();restart();renderPianoState();preparePiano();
})();
