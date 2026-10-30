const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const window={},document={getElementById:()=>null};
vm.runInNewContext(fs.readFileSync(__dirname+'/../games/do-i-have-absolute-pitch/training-session.js','utf8'),{window,document});
let clock=0;const api=window.ArcadePitchTraining,s=api.createSession({now:()=>clock,random:()=>.4});
const seen=[];
for(let i=0;i<30;i++){
 const note=s.next();seen.push(note);assert.equal(s.answer(true),null);
 s.open();clock+=200;const r=s.answer(note%12===5?note:false);assert.equal(r.correct,true);assert.equal(r.rt,200);assert.equal(s.answer(true),null);
}
assert.equal(new Set(seen).size,15);for(const f of [65,77,89])assert.equal(seen.filter(m=>m===f).length,5);
let stats=s.stats();assert.equal(stats.answered,30);assert.equal(stats.targetCount,15);assert.equal(stats.nonTargetCount,15);assert.equal(stats.accuracy,1);assert.equal(stats.meanCorrectRt,200);assert.equal(s.next(),null,'Round ends after 30 scored trials');
s.reset();s.next();s.open();clock+=5000;let late=s.answer(false);assert.equal(late.timeout,true);assert.equal(late.correct,false);assert.equal(late.rt,null);
s.next();s.open();clock+=4999;assert.equal(s.remaining(),1);assert.equal(s.answer(false).timeout,false);
const count=s.stats().answered,note=s.next();s.open();s.cancel();assert.equal(s.answer(true),null);assert.equal(s.stats().answered,count);
const tail=[];while(s.stats().answered<30){const m=s.next();tail.push(m);s.open();clock+=100;s.answer(m%12===5?m:false)}assert.ok(tail.includes(note),'Cancelled trial is returned to pool');assert.equal(s.stats().targetCount,15);assert.equal(s.stats().nonTargetCount,15);
s.reset();assert.equal(s.stats().accuracy,null);assert.equal(s.stats().meanCorrectRt,null);
for(let i=0;i<30;i++){s.next();s.open();clock+=100;s.answer(false)}
stats=s.stats();assert.equal(stats.accuracy,.5);assert.equal(stats.targetAccuracy,0);assert.equal(stats.nonTargetAccuracy,1);
s.reset();
for(let i=0;i<30;i++){const m=s.next();s.open();clock+=100;const row=s.answer(m%12===5?(m===65?77:65):false);assert.equal(row.correct,m%12!==5);assert.equal(row.octaveError,m%12===5);}
assert.equal(s.stats().octaveErrors,15);assert.equal(s.stats().targetAccuracy,0);
console.log('30-trial training: 50/50 balance, category metrics, deadlines, cancellation and restart passed.');
for(const stage of api.stages){
 assert.equal(stage.targets.length,(stage.index+1)*3);assert.equal(new Set(stage.pool).size,stage.pool.length);assert.ok(stage.targets.every(m=>stage.pool.includes(m)));
 assert.ok(stage.others.every(pc=>!stage.classes.includes(pc)));assert.ok(stage.pool.every(m=>m>=60&&m<=95));
 const round=api.createSession({stage:stage.index,now:()=>clock,random:()=>.37});
 for(let i=0;i<30;i++){const m=round.next();assert.ok(stage.pool.includes(m));round.open();clock+=100;assert.equal(round.answer(stage.targets.includes(m)?m:false).correct,true)}
 assert.equal(round.stats().accuracy,1);assert.equal(round.stats().targetCount,stage.index===11?30:15);assert.equal(round.next(),null);
}
assert.deepEqual(Array.from(api.stages[1].others),[2,3,6,7]);assert.deepEqual(Array.from(api.stages[2].others),[2,3,7,8]);assert.equal(api.stages[11].others.length,0);
// Exercise the actual listening controls, including rapid switches and stale ends.
const html=fs.readFileSync(__dirname+'/../games/do-i-have-absolute-pitch/learn.html','utf8'),ids={};
const {Element}=require('./music_game_fixture.cjs');
for(const [,id] of html.matchAll(/id="([^"]+)"/g))ids[id]=new Element();
const plays=[],ends=[],timers=new Map();let timerId=0;
const storage=new Map();
const browserWindow={localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},addEventListener(){},ArcadePitchPlayback:{create:()=>({start(){},stop(){}})},ArcadeMusicAudio:{create:({onStateChange})=>({readiness:()=>({state:'ready'}),prepare(){onStateChange()},stop(){},play(m,end,options){plays.push(m);ends.push(end);if(options.onStarted)options.onStarted()},retry(){}})}};
const ui={window:browserWindow,document:{hidden:false,getElementById:id=>ids[id],createElement:tag=>new Element(tag),addEventListener(){}},performance:{now:()=>clock},setTimeout(fn){timers.set(++timerId,fn);return timerId},clearTimeout(id){timers.delete(id)},setInterval:()=>++timerId,clearInterval(){}};
vm.createContext(ui);vm.runInContext(fs.readFileSync(__dirname+'/../shared/music/keyboard.js','utf8'),ui);vm.runInContext(fs.readFileSync(__dirname+'/../games/do-i-have-absolute-pitch/training-session.js','utf8'),ui);vm.runInContext(fs.readFileSync(__dirname+'/../games/do-i-have-absolute-pitch/training.js','utf8'),ui);
ids['pt-f4'].onclick();assert.equal(plays.at(-1),65);
const oldEnd=ends.at(-1);ids['pt-f6'].onclick();assert.equal(plays.at(-1),89);oldEnd();assert.equal(ids['pt-play'].disabled,true,'Old sample completion cannot finish a newer sample');ends.at(-1)();assert.equal(ids['pt-play'].disabled,false);assert.equal(ids['pt-count'].textContent,0);
ids['pt-f5'].onclick();assert.equal(plays.at(-1),77);ends.at(-1)();
ids['pt-sample'].onclick();for(let i=0;i<3;i++)ends.at(-1)();assert.deepEqual(plays.slice(-3).sort((a,b)=>a-b),[65,77,89]);assert.equal(ids['pt-count'].textContent,0,'All listening is unscored');
ids['pt-play'].onclick();assert.equal(ids['pt-f4'].disabled,true,'Listening unavailable during scored trials');const before=plays.length;ids['pt-f4'].onclick();assert.equal(plays.length,before);ends.at(-1)();clock+=300;ids['pt-other'].onclick();assert.equal(ids['pt-count'].textContent,1);ids['pt-f4'].onclick();ends.at(-1)();assert.equal(ids['pt-count'].textContent,1,'Listening preserves scored results');
console.log('Listening controls: F4/F5/F6, random sequence, interruption, stale callbacks and score isolation passed.');
const keys=ids['pt-keyboard'].children;
assert.equal(keys.filter(k=>k.textContent&&k.title).length,36,'Shared labelAll renders labels for available and unavailable keys');
assert.equal(keys.length,36);assert.equal(keys.filter(k=>k.className.includes('listening-target')).length,3);assert.equal(keys.filter(k=>k.className.includes('listening-other')).length,12);assert.equal(keys.filter(k=>!k.disabled).length,15);
for(const midi of api.pool){const key=keys.find(k=>Number(k.dataset.midi)===midi);assert.ok(key.textContent);key.onclick();assert.equal(plays.at(-1),midi);ends.at(-1)();assert.equal(ids['pt-count'].textContent,1);}
assert.ok(ids['pt-breakdown'].innerHTML.includes('Target trials:'));assert.ok(!ids['pt-breakdown'].innerHTML.includes('F trials:'));
for(let i=1;i<30;i++){ids['pt-play'].onclick();const midi=plays.at(-1);ends.at(-1)();clock+=100;ids['pt-other'].onclick();
 assert.ok(ids['pt-feedback'].textContent.includes(keys.find(k=>Number(k.dataset.midi)===midi).title),'Feedback gives the actual pitch and octave');
 assert.ok(ids['pt-feedback'].textContent.startsWith(midi%12===5?'✕ Incorrect':'✓ Correct'));
}
assert.equal(ids['pt-count'].textContent,30);assert.equal(ids['pt-play'].disabled,true);assert.equal(ids['pt-summary'].hidden,false);assert.ok(ids['pt-summary'].textContent.includes('/30 correct'));assert.equal(keys.filter(k=>!k.disabled).length,15,'Listening remains available after round ends');
console.log('Listening keyboard: labels, 36 keys, 3 targets, 12 non-targets, MIDI mapping and 30-trial auto-stop passed.');

const answerKeys=ids['pt-answer-keyboard'].children;
assert.equal(answerKeys.length,36);assert.equal(answerKeys.filter(k=>k.className.includes('answer-target')).length,3);assert.equal(answerKeys.filter(k=>!k.disabled).length,0);
ids['pt-reset'].onclick();
let foundTarget=false;
for(let i=0;i<30;i++){
 ids['pt-play'].onclick();const m=plays.at(-1);assert.equal(answerKeys.filter(k=>!k.disabled).length,0,'Cannot answer during stimulus');ends.at(-1)();assert.equal(answerKeys.filter(k=>!k.disabled).length,3);clock+=150;
 if(m%12===5){answerKeys.find(k=>Number(k.dataset.midi)===(m===65?77:65)).onclick();foundTarget=true;assert.ok(ids['pt-feedback'].textContent.startsWith('✕ Incorrect'));assert.ok(ids['pt-breakdown'].innerHTML.includes('Octave errors: <strong>1'));const n=ids['pt-count'].textContent;answerKeys.find(k=>Number(k.dataset.midi)===m).onclick();assert.equal(ids['pt-count'].textContent,n,'Wrong octave is final, no retry scoring');break;}
 ids['pt-other'].onclick();assert.ok(ids['pt-feedback'].textContent.startsWith('✓ Correct'));
}
assert.equal(foundTarget,true);ids['pt-reset'].onclick();
for(let i=0;i<30;i++){ids['pt-play'].onclick();const m=plays.at(-1);ends.at(-1)();clock+=150;if(m%12===5)answerKeys.find(k=>Number(k.dataset.midi)===m).onclick();else ids['pt-other'].onclick();}
assert.equal(ids['pt-accuracy'].textContent,'100%');assert.equal(ids['pt-count'].textContent,30);assert.equal(ids['pt-play'].disabled,true);
console.log('Answer piano: exact MIDI/octave grading, teal target keys only, playback gate, one answer per trial and perfect-round scoring passed.');
assert.equal(ids['pt-done-0'].checked,false,'Round results do not set manual completion');
ids['pt-done-0'].checked=true;ids['pt-done-0'].onchange();assert.ok(ids['pt-progress'].textContent.startsWith('1 / 12'));assert.ok(ids['pt-stage'].children[0].textContent.startsWith('✓'));
ids['pt-next'].onclick();assert.equal(ids['pt-training-step-title'].textContent,'Step 2 · Add E');assert.equal(ids['pt-count'].textContent,0);assert.equal(ids['pt-done-1'].checked,false);assert.equal(ids['pt-done-0'].checked,true);assert.equal(ids['pt-f4'].textContent,'E4');assert.equal(answerKeys.filter(k=>k.className.includes('answer-target')).length,6);
ids['pt-play'].onclick();const stale=ends.at(-1);ids['pt-next'].onclick();stale();assert.equal(ids['pt-count'].textContent,0);assert.equal(answerKeys.filter(k=>!k.disabled).length,0,'Switching stages cancels stale playback and scoring');
ids['pt-stage'].value='11';ids['pt-stage'].onchange();assert.equal(ids['pt-other'].hidden,true);assert.equal(ids['pt-next'].disabled,true);assert.equal(answerKeys.filter(k=>k.className.includes('answer-target')).length,36);assert.equal(keys.filter(k=>k.className.includes('listening-other')).length,0);
ids['pt-play'].onclick();ends.at(-1)();assert.equal(answerKeys.filter(k=>!k.disabled).length,36);const lastMidi=plays.at(-1);answerKeys.find(k=>Number(k.dataset.midi)===lastMidi).onclick();assert.ok(ids['pt-feedback'].textContent.startsWith('✓ Correct'));
ids['pt-stage'].value='0';ids['pt-stage'].onchange();assert.equal(ids['pt-done-0'].checked,true);assert.equal(keys.filter(k=>k.className.includes('listening-target')).length,3);assert.equal(keys.filter(k=>k.className.includes('listening-other')).length,12);
ids['pt-done-0'].checked=false;ids['pt-done-0'].onchange();assert.equal(JSON.parse([...storage.values()][0]).completed.length,0);
ids['pt-done-4'].checked=true;ids['pt-done-4'].onchange();assert.equal(ids['pt-stage'].value,'0','Marking a table row does not change the current session');assert.deepEqual(JSON.parse([...storage.values()][0]).completed,[4]);
ids['pt-open-4'].onclick();assert.equal(ids['pt-stage'].value,'4');assert.equal(ids['pt-open-4'].attributes['aria-current'],'step');assert.equal(ids['pt-done-4'].checked,true);assert.equal(ids['pt-training-step-title'].textContent,'Step 5 · Add G');
console.log('All 12 stages: cumulative targets, changing distractors, exact-note grading, final-stage target-only answers, switch cancellation, manual completion and saved progress passed.');
