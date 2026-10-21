/**
 * Do I Have Absolute Pitch? listening-game regression tests.
 * Runs the real game with a deterministic audio stub to check Play/Replay,
 * answer scoring, hints, custom note pools, and question transitions.
 * No sound is emitted; real iPad playback still needs manual testing.
 * Run: node scripts/test_absolute_pitch.cjs
 */
// Exercise the real listening game and shared keyboard; audio is controlled deterministically.
const assert=require('node:assert/strict');
const {fixture}=require('./music_game_fixture.cjs');
let ready=true,plays=[],stops=0,completions=[];
const {ctx,ids,game:g}=fixture('do-i-have-absolute-pitch',{audio:()=>({
 play:(m,onEnded)=>{plays.push(m);if(onEnded)completions.push(onEnded)},stop:()=>stops++,setEnabled(){},prepare(){},retry(){},
 readiness:ps=>({done:ready?ps.length:0,total:ps.length,state:ready?'ready':'loading'})
})});
const key=m=>ids.npxletters.children.find(x=>Number(x.dataset.midi)===m);
assert.equal(ids.npxletters.children.length,25);
assert.equal(plays.length,0,'First question waits for a user gesture');
assert.equal(ids.pitchlabel.textContent,'Play Pitch');
assert.equal(ids.pitchplay.attributes['aria-label'],'Play the mystery pitch');
assert.equal(ids.npx.dataset.pitchPlaying,'false','Waves are idle before playback');
key(g.q.m).onclick();assert.equal(ids.npxnum.textContent,'0','Unheard question cannot be scored');
g.playPitch();const target=g.q.m;
assert.equal(ids.npx.dataset.pitchPlaying,'true','Ready playback starts the decorative waves');
assert.equal(ids.pitchlabel.textContent,'Play Pitch','First playback keeps Play until completion');
completions.at(-1)();assert.equal(ids.pitchlabel.textContent,'Replay Pitch');
assert.equal(ids.npx.dataset.pitchPlaying,'true','Natural audio completion lets the visual tail finish');
g.playPitch();assert.deepEqual(plays,[target,target]);
assert.equal(g.q.m,target,'Replay preserves question');
const wrong=target>=60?target-12:target+12;
key(wrong).onclick();assert.equal(ids.npxacc.textContent,'0%');
assert.equal(ids.npx.dataset.pitchPlaying,'false','Answering cancels mystery-pitch motion');
assert.equal(plays.at(-1),wrong,'Wrong answer plays the pressed key, not the target');
key(target).onclick();assert.equal(plays.at(-1),target,'Correct answer also plays the pressed key');assert.equal(g.locked,true);assert.equal(ids.npxacc.textContent,'0%');
const staleCompletion=completions.at(-1);
g.next();assert.equal(plays.at(-1),g.q.m,'Following question automatically plays');
assert.equal(ids.pitchlabel.textContent,'Play Pitch');staleCompletion();
assert.equal(ids.npx.dataset.pitchPlaying,'true','Stale completion cannot stop a new pitch effect');
assert.equal(ids.pitchlabel.textContent,'Play Pitch','Previous question cannot change new label');
completions.at(-1)();assert.equal(ids.pitchlabel.textContent,'Replay Pitch');
key(g.q.m).onclick();assert.equal(ids.npxacc.textContent,'50%');
g.next();ids.npxreveal.onclick();assert.equal(g.locked,true);assert.ok(key(g.q.m).className.includes('show'));
const count=ids.npxnum.textContent;g.playPitch();assert.equal(ids.npxnum.textContent,count);
ready=false;g.next();assert.equal(ids.pitchlabel.textContent,'Play Pitch');key(g.q.m).onclick();assert.equal(ids.npxnum.textContent,count,'Loading question cannot be answered');
assert.equal(ids.npx.dataset.pitchPlaying,'false','Loading alone does not animate');
ready=true;g.renderPianoState();assert.equal(plays.at(-1),g.q.m,'Load completion plays only the current question');
ids.npxsettings.onclick();const n=plays.length;g.playPitch();key(g.q.m).onclick();assert.equal(plays.length,n);assert.equal(ids.npxnum.textContent,count);
assert.equal(ids.npx.dataset.pitchPlaying,'false','Opening Settings clears the waves');
ids.npxclose.onclick();
// Hints toggle changes feedback without changing question, score or audio.
const target2=g.q.m,other=target2===48?49:48;
key(other).onclick();assert.ok(key(other).className.includes(other<target2?'low':'high'));
const beforeHintScore=ids.npxnum.textContent;
ids.pitchhints.onclick();assert.equal(g.cfg.hints,false);assert.ok(key(other).className.includes('bad'));
key(other).onclick();assert.equal(plays.at(-1),other,'Hints off still plays the pressed key');
const afterOffPlays=plays.length;
assert.ok(!ids.npxmsg.textContent.includes('Too '));
ids.pitchhints.onclick();assert.equal(g.cfg.hints,true);assert.ok(!key(other).className.includes('bad'));
assert.equal(g.q.m,target2);assert.equal(plays.length,afterOffPlays);assert.equal(ids.npxnum.textContent,beforeHintScore);
key(target2).onclick();assert.ok(key(target2).className.includes('good'));
ids.pitchhints.onclick();assert.ok(key(target2).className.includes('good'),'Toggle preserves correct green');
g.next();assert.ok(ids.npxletters.children.every(b=>!/(?:low|high|good|bad)/.test(b.className)));
for(const m of [g.q.m-1,g.q.m+1].filter(m=>m>=48&&m<=72)){
 ids.pitchhints.onclick();if(!g.cfg.hints)ids.pitchhints.onclick();
 key(m).onclick();assert.ok(key(m).className.includes(m<g.q.m?'low':'high'));
}
ids.npxsettings.onclick();ids.pitchranges.children[0].onclick();ids.pitchselectwhite.onclick();ids.npxapply.onclick();
assert.equal(g.cfg.range,'lower');assert.equal(g.cfg.selectedByRange.lower.length,15);
const seen=new Set();for(let i=0;i<15;i++){seen.add(g.q.m);assert.ok(key(g.q.m));assert.ok(![1,3,6,8,10].includes(g.q.m%12));g.next()}
assert.equal(seen.size,15,'Each eligible pitch appears once per shuffled bag');
assert.ok(stops>0);assert.equal(ctx.window.test.q.m,g.q.m);
console.log('Absolute Pitch passed: first gesture, replay, exact octave, retry scoring, reveal, loading, settings, directional hints, shuffled range.');

// Disconnected custom choices are the entire question pool; draft changes require Apply.
ids.npxsettings.onclick();
const pick=m=>ids.pitchselection.children.find(b=>Number(b.dataset.midi)===m);
for(let m=36;m<=60;m++)if(![36,41,59].includes(m)&&g.cfg.selectedByRange.lower.includes(m))pick(m).onclick();
pick(59).onclick(); // Add a non-adjacent note; 59 is already selected by White keys, so toggle back below.
if(!pick(59).className.includes('selected'))pick(59).onclick();
assert.equal(g.cfg.selectedByRange.lower.length,15,'Draft edits do not affect the running pool');
ids.npxapply.onclick();assert.deepEqual(Array.from(g.candidates()),[36,41,59]);
const customSeen=new Set();for(let i=0;i<3;i++){customSeen.add(g.q.m);assert.ok([36,41,59].includes(g.q.m));g.next()}
assert.equal(customSeen.size,3);
ids.npxsettings.onclick();pick(41).onclick();pick(59).onclick();pick(36).onclick();
assert.ok(ids.pitchselectionstatus.textContent.startsWith('0 notes selected'));
const previousPitch=g.q.m;ids.npxapply.onclick();
assert.equal(ids.npxshade.hidden,false);assert.equal(g.q.m,previousPitch);
assert.equal(ids.pitchselectionstatus.textContent,'Please select at least one note before saving.');
pick(36).onclick();ids.npxapply.onclick();for(let i=0;i<4;i++){assert.equal(g.q.m,36);g.next()}
ids.npxsettings.onclick();ids.pitchranges.children[2].onclick();ids.pitchselectall.onclick();ids.npxclose.onclick();
assert.equal(g.cfg.range,'lower','Closing without Apply preserves active range');
ids.npxsettings.onclick();ids.pitchranges.children[2].onclick();ids.npxapply.onclick();
assert.equal(g.cfg.range,'upper');assert.equal(g.candidates().length,25);
ids.npxsettings.onclick();ids.pitchranges.children[0].onclick();ids.npxapply.onclick();
assert.deepEqual(Array.from(g.candidates()),[36],'Each range remembers its own selected notes');
console.log('Custom note selection passed: disconnected pool, single note, non-empty guard, per-range memory, Apply/Cancel.');

ids.npxsettings.onclick();ids.pitchselectblack.onclick();
assert.equal(ids.pitchselection.children.filter(b=>b.className.includes('selected')).length,10);
assert.ok(ids.pitchselection.children.filter(b=>b.className.includes('selected')).every(b=>[1,3,6,8,10].includes(Number(b.dataset.midi)%12)));
ids.npxapply.onclick();for(let i=0;i<12;i++){assert.ok([1,3,6,8,10].includes(g.q.m%12));g.next()}
ids.npxsettings.onclick();ids.pitchselectall.onclick();assert.equal(ids.pitchselection.children.filter(b=>b.className.includes('selected')).length,25);
ids.pitchselectnone.onclick();const pool=Array.from(g.candidates()),beforeEmptyPlay=plays.length;
ids.npxapply.onclick();assert.equal(ids.npxshade.hidden,false);assert.deepEqual(Array.from(g.candidates()),pool);assert.equal(plays.length,beforeEmptyPlay);
assert.equal(ids.pitchselectionstatus.attributes.role,'alert');
pick(37).onclick();ids.npxapply.onclick();assert.equal(ids.npxshade.hidden,true);assert.deepEqual(Array.from(g.candidates()),[37]);
console.log('Selection shortcuts passed: All, White Only, Black Only, None, empty Save blocked and corrected.');

const beforeRestart=plays.length;ids.npxrestart.onclick();
assert.equal(plays.length,beforeRestart,'Restart waits for the first Play click');
assert.equal(ids.pitchlabel.textContent,'Play Pitch');
g.playPitch();completions.at(-1)();assert.equal(ids.pitchlabel.textContent,'Replay Pitch');
ids.npxsettings.onclick();ids.npxapply.onclick();assert.equal(ids.pitchlabel.textContent,'Play Pitch','Save & Play starts a fresh unplayed question');
console.log('Play label regression passed: first play, completion, replay, new question, restart and settings reset.');

// Replaying the same question supersedes old completions; motion cannot get stuck
// if the audio engine stops without a natural onEnded notification.
g.playPitch();const oldPlayback=completions.at(-1);g.playPitch();oldPlayback();
assert.equal(ids.npx.dataset.pitchPlaying,'true','An old replay callback cannot clear the current waves');
completions.at(-1)();assert.equal(ids.npx.dataset.pitchPlaying,'true');
let motionFallback;const originalTimeout=ctx.setTimeout;
ctx.setTimeout=(callback,ms)=>{if(ms===2450)motionFallback=callback;return 1};
g.playPitch();assert.equal(ids.npx.dataset.pitchPlaying,'true');
assert.equal(typeof motionFallback,'function');motionFallback();
assert.equal(ids.npx.dataset.pitchPlaying,'false','Interrupted audio has a bounded visual fallback');
ids.npxrestart.onclick();assert.equal(ids.npx.dataset.pitchPlaying,'false');
ctx.setTimeout=originalTimeout;
console.log('Pitch waves passed: playback, completion, loading, answers, settings, restart, stale replay and bounded fallback.');
