// Real game + keyboard, controlled capture/playback: no hardware claims.
const assert=require('node:assert/strict');
const {fixture}=require('./music_game_fixture.cjs');
let callbacks,threshold,starts=0,sounds=[],ends=[],sequence=0;
const timers=new Map(),events={},windowEvents={};
const {ctx,ids,game:g}=fixture('do-i-have-absolute-pitch',{
 setTimeout:(fn,delay)=>{const id=++sequence;timers.set(id,{fn,delay});return id},clearTimeout:id=>timers.delete(id),
 documentEvent:(event,cb)=>events[event]=cb,windowEvent:(event,cb)=>windowEvents[event]=cb,
 audio:()=>({play:(m,end)=>{sounds.push(m);if(end)ends.push(end)},stop(){},prepare(){},retry(){},readiness:()=>({state:'ready',done:9,total:9})}),
 mic:o=>{callbacks=o;threshold=o.minRms;return {start(){starts++;o.onState('listening')},stop(){o.onState('stopped')},reset(){},setThreshold(v){threshold=v}}}
});
const button=ids.npxsettings.adjacentBefore[0];
const sensitivities=ids.npxloadpanel.adjacentBefore[1];
const key=m=>ids.npxletters.children.find(b=>Number(b.dataset.midi)===m);
const note=m=>callbacks.onNote({midi:m});
function finish(){ends.at(-1)();for(const [id,t] of [...timers])if(t.delay===350){timers.delete(id);t.fn()}}
assert.equal(starts,0);assert.equal(threshold,.001);
assert.equal(ids.npxmsg.textContent,'Tap “Play Pitch” to begin');
assert(button.innerHTML.includes('M3 3l18 18'),'Off icon is crossed out');assert(ids.npxkeyhint.hidden);
button.onclick();assert.equal(starts,1);assert(ids.npxletters.children.every(b=>b.disabled));
assert(!button.innerHTML.includes('M3 3l18 18'),'On icon has no slash');
note(g.q.m);assert.equal(ids.npxnum.textContent,'0','Cannot answer before hearing a question');
g.playPitch();assert.equal(ids.npxmsg.textContent,'Play the matching piano key on a physical piano');note(g.q.m);assert.equal(ids.npxnum.textContent,'0','Speaker playback cannot answer itself');
ends.at(-1)();note(g.q.m);assert.equal(ids.npxnum.textContent,'0','Ignore acoustic tail');
finish();key(g.q.m).onclick();assert.equal(ids.npxnum.textContent,'0','Touch events cannot grade in piano mode');
const target=g.q.m,wrong=target===60?61:target-1,count=sounds.length;
note(wrong);assert(key(wrong).className.includes(wrong<target?'low':'high'));assert.equal(ids.npxacc.textContent,'0%');
note(target);assert(g.locked);assert(key(target).className.includes('good'));assert.equal(sounds.length,count,'No duplicated piano output');
g.next();note(g.q.m);assert.equal(Number(ids.npxnum.textContent),1,'Automatic next pitch is also gated');finish();
g.playPitch();const stale=ends.at(-1);g.playPitch();stale();note(g.q.m);assert.equal(Number(ids.npxnum.textContent),1,'Stale playback cannot rearm answers');finish();
ids.npxsettings.onclick();note(g.q.m);assert.equal(Number(ids.npxnum.textContent),1);
sensitivities.children[2].onclick();ids.npxapply.onclick();assert.equal(threshold,.0003);
ids.npxsettings.onclick();sensitivities.children[0].onclick();ids.npxclose.onclick();assert.equal(threshold,.0003,'Cancel preserves sensitivity');
callbacks.onState('error','Permission denied');assert.equal(button.attributes['aria-pressed'],'false');assert(ids.npxletters.children.every(b=>!b.disabled));
button.onclick();ctx.document.hidden=true;events.visibilitychange();assert.equal(button.attributes['aria-pressed'],'false');
note(g.q.m);assert.equal(ids.npxnum.textContent,'0');ctx.document.hidden=false;
button.onclick();windowEvents.pagehide();assert.equal(button.attributes['aria-pressed'],'false');
g.playPitch();assert.equal(ids.npxmsg.textContent,'Tap the matching piano key below','Answer instructions appear immediately, without a playback status');finish();assert.equal(ids.pitchlabel.textContent,'Replay Pitch');assert.equal(ids.npxmsg.textContent,'Tap the matching piano key below');key(g.q.m).onclick();assert(g.locked,'Touch play still works');
console.log('Absolute Pitch microphone passed: exact MIDI, echo gate, tail, replay race, touch isolation, feedback, shared sensitivity, settings, denial and background cleanup.');
