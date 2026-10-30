// Practice UI only. Stage pools, sampling and scoring live in training-session.js.
(()=>{'use strict';
const {createSession,stages,names:NAMES,roundSize,answerMs,low,high}=window.ArcadePitchTraining;
const root=document.getElementById('pitch-training');if(!root)return;
const el=id=>document.getElementById('pt-'+id);
el('timer').max=answerMs;
const STORAGE='arcade-pitch-training-progress-v1';
let saved={stage:0,completed:[]};
try{const value=JSON.parse(window.localStorage.getItem(STORAGE));if(value&&Number.isInteger(value.stage)&&value.stage>=0&&value.stage<stages.length&&Array.isArray(value.completed))saved={stage:value.stage,completed:[...new Set(value.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<stages.length))]}}catch{}
let currentStage=saved.stage,config=stages[currentStage],session=createSession({stage:currentStage});
function persist(){try{window.localStorage.setItem(STORAGE,JSON.stringify(saved))}catch{}}
function progress(){for(const s of stages){el('done-'+s.index).checked=saved.completed.includes(s.index);el('open-'+s.index).setAttribute('aria-current',s.index===currentStage?'step':'false')}el('progress').textContent=`${saved.completed.length} / ${stages.length} marked`;for(const option of el('stage').children){const s=stages[Number(option.value)];option.textContent=`${saved.completed.includes(s.index)?'✓ ':''}Step ${s.index+1} · ${s.index?'Add ':'Learn '}${s.name}`;}el('prev').disabled=currentStage===0;el('next').disabled=currentStage===stages.length-1;}
for(const s of stages){const option=document.createElement('option');option.value=s.index;el('stage').append(option)}
const listeningNotes=[['f4',65],['f5',77],['f6',89]];
const keyboard=window.PlayThatNoteKeyboard.create({container:el('keyboard'),labelAll:true,onAnswer:m=>{if(config.pool.includes(m))hearExamples([m])}});
keyboard.render(low,high);

const answerKeyboard=window.PlayThatNoteKeyboard.create({container:el('answer-keyboard'),labelAll:true,onAnswer:m=>{if(config.targets.includes(m))finish(m)}});
answerKeyboard.render(low,high);

let sampleReturnPhase='idle',phase='idle',serial=0,interval=null,watchdog=null,started=null,ready=false;
const audio=window.ArcadeMusicAudio.create({root,isEnabled:()=>true,getQuestion:()=>serial,onStateChange:updateReady});
const motion=window.ArcadePitchPlayback.create({root,button:el('play')});
const percent=v=>v===null?'—':Math.round(v*100)+'%';
function updateReady(){const s=audio.readiness(config.pool);ready=s.state==='ready';el('audio').textContent=ready?'Piano sounds ready':s.state==='error'?'Piano sounds could not load. Retry sounds.':'Loading piano sounds…';el('retry').hidden=s.state!=='error';controls()}
function controls(){el('play').disabled=!ready||!['idle','feedback','paused'].includes(phase);for(const id of ['sample',...listeningNotes.map(([id])=>id)])el(id).disabled=!ready||!['idle','paused','feedback','complete','sample'].includes(phase);for(const key of el('keyboard').children)key.disabled=el('sample').disabled||!config.pool.includes(Number(key.dataset.midi));for(const key of el('answer-keyboard').children)key.disabled=phase!=='answer'||!config.targets.includes(Number(key.dataset.midi));el('other').disabled=phase!=='answer';el('other').hidden=config.others.length===0;el('end').disabled=started===null||phase==='complete';}
function clearTimers(){clearInterval(interval);clearTimeout(watchdog);interval=null;watchdog=null}
function metrics(){const s=session.stats();el('count').textContent=s.answered;el('accuracy').textContent=percent(s.accuracy);el('target-accuracy').textContent=percent(s.targetAccuracy);el('other-accuracy').textContent=percent(s.nonTargetAccuracy);el('correct-rt').textContent=s.meanCorrectRt===null?'—':(s.meanCorrectRt/1000).toFixed(2)+' s';el('timeouts').textContent=s.timeouts;el('breakdown').innerHTML=`<span>Target trials: <strong>${s.targetCount}</strong></span><span>Non-target trials: <strong>${s.nonTargetCount}</strong></span><span>Correct: <strong>${s.correct}</strong></span><span>Octave errors: <strong>${s.octaveErrors}</strong></span>`;}
function timer(){const left=session.remaining();el('remaining').textContent=(left/1000).toFixed(1)+' s';el('timer').value=left;el('elapsed').textContent=started===null?'0:00':formatTime(performance.now()-started);if(phase==='answer'&&left<=0)finish(null)}
function formatTime(ms){const seconds=Math.floor(ms/1000);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')}
function finish(choice){if(phase!=='answer')return;const result=session.answer(choice);if(!result)return;clearTimers();audio.stop();phase='feedback';for(const key of el('answer-keyboard').children){key.setAttribute('aria-pressed',String(Number(key.dataset.midi)===choice));}const name=keyboard.name(result.midi),category=result.target?'Target':'Non-target';el('feedback').className='pt-feedback '+(result.correct?'is-correct':'is-wrong');el('feedback').textContent=result.timeout?`✕ Time’s up — ${name} (${category}).`:result.correct?`✓ Correct — ${name} (${category}).`:`✕ Incorrect — ${name} (${category}).`;el('remaining').textContent='—';el('timer').value=0;el('instruction').textContent='Tap “Play Pitch” for the next trial.';metrics();if(session.stats().answered===roundSize)endSession();else controls();}
function play(){if(el('play').disabled)return;clearTimers();motion.stop();audio.stop();const token=++serial,midi=session.next();for(const key of el('answer-keyboard').children)key.setAttribute('aria-pressed','false');phase='playing';el('summary').hidden=true;el('feedback').textContent='';el('feedback').className='pt-feedback';el('instruction').textContent=config.others.length?'Tap the matching teal target key, including its octave, or choose Non-target.':'Tap the matching teal target key, including its octave.';el('remaining').textContent=(answerMs/1000).toFixed(1)+' s';el('timer').value=answerMs;controls();
 watchdog=setTimeout(()=>{if(serial!==token)return;abortTrial('Playback did not start. Tap “Play Pitch” to try again.');},2500);
 audio.play(midi,()=>{if(serial!==token||phase!=='playing')return;clearTimeout(watchdog);session.open();phase='answer';controls();interval=setInterval(timer,50);timer();},{duration:.8,onStarted(){if(serial!==token)return;motion.start();clearTimeout(watchdog);if(started===null)started=performance.now();watchdog=setTimeout(()=>{if(serial===token&&phase==='playing')abortTrial('Playback was interrupted. Tap “Play Pitch” to try again.');},2500);}});
}
function abortTrial(message){++serial;clearTimers();motion.stop();audio.stop();session.cancel();phase='paused';el('instruction').textContent=message;el('remaining').textContent='—';el('timer').value=0;controls();}
function reset(){abortTrial('Tap “Play Pitch” to begin.');session.reset();for(const key of el('answer-keyboard').children)key.setAttribute('aria-pressed','false');started=null;phase='idle';el('elapsed').textContent='0:00';el('feedback').textContent='';el('feedback').className='pt-feedback';el('summary').hidden=true;metrics();controls();}
el('play').onclick=play;el('other').onclick=()=>finish(false);el('reset').onclick=reset;
el('retry').onclick=()=>audio.retry(config.pool);
function endSession(){abortTrial('Session finished. Restart begins a new session.');phase='complete';const s=session.stats();el('summary').hidden=false;el('summary').textContent=`Session complete · ${s.correct}/${s.answered} correct · ${percent(s.accuracy)} accuracy. Restart begins another round.`;metrics();controls();}
el('end').onclick=endSession;
function hearExamples(notes){
 if(el('sample').disabled)return;
 if(phase!=='sample')sampleReturnPhase=phase;
 clearTimers();motion.stop();audio.stop();const token=++serial;phase='sample';controls();let index=0;
 const next=()=>{
  if(token!==serial)return;
  if(index===notes.length){clearTimers();phase=sampleReturnPhase;controls();return;}
  const midi=notes[index++];
  audio.play(midi,next,{duration:.8});
 };
 watchdog=setTimeout(()=>{if(serial===token){abortTrial('Playback was interrupted. Tap a listening key to try again.');}},Math.max(6000,notes.length*1000+2000));next();
}
for(const [id,midi] of listeningNotes)el(id).onclick=()=>hearExamples([midi-5+config.added]);
el('sample').onclick=()=>{const notes=[...config.targets];for(let i=notes.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[notes[i],notes[j]]=[notes[j],notes[i]]}hearExamples(notes);};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['answer','playing','sample'].includes(phase))abortTrial('Trial paused while away. Tap “Play Pitch” to start a fresh trial.');});
window.addEventListener('pagehide',()=>abortTrial('Tap “Play Pitch” to resume.'));
function configureStage(index){
 reset();currentStage=index;config=stages[index];session=createSession({stage:index});saved.stage=index;persist();
 el('stage').value=String(index);el('training-step-title').textContent=`Step ${index+1} · ${index?'Add ':'Learn '}${config.name}`;
 const names=config.classes.map(n=>NAMES[n]).join(' · '),otherNames=config.others.map(n=>NAMES[n]).join(' · ');
 el('step-description').textContent=index?`Now add ${config.name} to the targets. Keep practicing the earlier target notes, too.`:'Start with F as the target.';
 el('practice-help').textContent=config.others.length?'For a target pitch, tap its exact piano key, including the octave. For a non-target pitch, select the Non-target button.':'All notes are targets. Tap the exact piano key, including the octave.';
 el('listen-title').textContent=`Hear ${config.name} in three octaves`;
 for(const [id,midi] of listeningNotes){const m=midi-5+config.added;el(id).textContent=NAMES[m%12]+Math.floor(m/12-1)}
 el('sample').textContent='♫ Hear all targets in a random order';
 el('target-legend').textContent='Target · '+names+(index===0?'4, F5, F6':' · octaves 4–6');el('other-legend').textContent='Non-target · '+otherNames;el('other-legend-wrap').hidden=!config.others.length;
 el('explore-title').textContent=config.others.length?'Hear target and non-target notes':'Hear all target notes';
 el('explore-instruction').textContent=config.others.length?'Tap the teal target keys or pale yellow non-target keys to compare their sounds.':'Tap any teal target key to compare the sounds of all 12 note names.';
 el('keyboard').setAttribute('aria-label',config.others.length?'Listening piano, C4 to B6. Teal targets and pale yellow non-targets.':'Listening piano, C4 to B6. All keys are teal targets.');
 el('answer-names').textContent=index===0?'F4 · F5 · F6':names+' · octaves 4–6';
 for(const key of el('keyboard').children){const m=Number(key.dataset.midi),name=keyboard.name(m),target=config.targets.includes(m),available=config.pool.includes(m);key.classList.remove('listening-target');key.classList.remove('listening-other');if(available)key.classList.add(target?'listening-target':'listening-other');key.setAttribute('aria-label',name+(available?target?', target':', non-target':', unavailable'));}
 for(const key of el('answer-keyboard').children){const m=Number(key.dataset.midi),name=answerKeyboard.name(m);key.classList.remove('answer-target');if(config.targets.includes(m))key.classList.add('answer-target');key.setAttribute('aria-label',name+(config.targets.includes(m)?', target answer':', unavailable'));}
 metrics();progress();ready=false;controls();audio.prepare(config.pool);
}
el('prev').onclick=()=>{if(currentStage>0)configureStage(currentStage-1)};
el('next').onclick=()=>{if(currentStage<stages.length-1)configureStage(currentStage+1)};
el('stage').onchange=()=>{const index=Number(el('stage').value);if(Number.isInteger(index)&&index>=0&&index<stages.length)configureStage(index)};
for(const s of stages){
 el('open-'+s.index).onclick=()=>configureStage(s.index);
 el('done-'+s.index).onchange=()=>{saved.completed=saved.completed.filter(n=>n!==s.index);if(el('done-'+s.index).checked)saved.completed.push(s.index);persist();progress()};
}
configureStage(currentStage);
})();
