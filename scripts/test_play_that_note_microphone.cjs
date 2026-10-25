// Exercise the real game and keyboard with deterministic microphone events.
// Physical audio detection is tested separately in test_piano_input.cjs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {Element}=require('./music_game_fixture.cjs');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('games/play-that-note/index.html'),ids={};
for(const [,id] of html.matchAll(/id="([^"]+)"/g)){ids[id]=new Element();ids[id].previousElementSibling=new Element()}
ids.npx.querySelector=s=>ids[s.slice(1)];ids.npxshade.hidden=true;ids.npxletters.parentElement=new Element();
const documentEvents={},windowEvents={};
const document={hidden:false,getElementById:id=>ids[id],createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),addEventListener:(event,cb)=>documentEvents[event]=cb};
let callbacks,threshold,starts=0,stops=0,sounds=0;
const window={addEventListener:(event,cb)=>windowEvents[event]=cb,localStorage:null,
 ArcadeMusicAudio:{create:()=>({play(){sounds++},wrong(){sounds++},prepare(){},setEnabled(){},readiness:()=>({state:'ready',done:1,total:1})})},
 ArcadePianoInput:{create:o=>{callbacks=o;threshold=o.minRms;return {start(){starts++;o.onState('listening')},stop(){stops++;o.onState('stopped')},reset(){},setThreshold(value){threshold=value}}}}
};
const ctx={window,document,setTimeout:()=>1,clearTimeout(){},console};vm.createContext(ctx);
for(const file of ['shared/settings.js','shared/music/pitch.js','shared/music/notation.js','shared/music/keyboard.js'])vm.runInContext(read(file),ctx);
vm.runInContext(read('games/play-that-note/game.js').replace('})();','window.test={get q(){return q},get sensitivityOptions(){return sensitivityOptions},next};})();'),ctx);
const key=m=>ids.npxletters.children.find(b=>Number(b.dataset.midi)===m);
const target=()=>window.test.q.m;
assert(ids.npxletters.children.every(b=>!b.disabled));
assert.equal(starts,0,'Capture requires a user gesture');assert.equal(threshold,.003);
assert.equal(ids.npxkeyhint.hidden,true);
ids.npxinput.onclick();assert(ids.npxletters.children.every(b=>b.disabled));
const initial=ids.npxnum.textContent;
// Directly call the handler as well: a touch cannot grade even if native disabled
// behavior is bypassed by a queued event or another caller.
key(target()).onclick();assert.equal(ids.npxnum.textContent,initial);
const wrong=target()===60?61:target()-1;
callbacks.onNote({midi:wrong,cents:0});assert(key(wrong).className.includes('bad'));assert.equal(ids.npxacc.textContent,'0%');
assert.equal(ids.npxmicstatus.textContent,'Microphone on');
callbacks.onNote({midi:target(),cents:0});assert(key(target()).className.includes('good'));
assert.equal(sounds,0,'Microphone mode suppresses speaker feedback');
window.test.next();assert(ids.npxletters.children.every(b=>b.disabled));
ids.npxinput.onclick();assert(ids.npxletters.children.every(b=>!b.disabled));
key(target()).onclick();assert(key(target()).className.includes('good'));assert.equal(ids.npxacc.textContent,'50%');
assert.equal(sounds,1);
// Switching off after a correct answer must preserve the question's lock.
ids.npxinput.onclick();ids.npxinput.onclick();assert(ids.npxletters.children.every(b=>b.disabled));
window.test.next();assert(ids.npxletters.children.every(b=>!b.disabled));
// Apply High; closing Settings without applying a later Low choice preserves it.
ids.npxsettings.onclick();window.test.sensitivityOptions.children[2].onclick();ids.npxapply.onclick();assert.equal(threshold,.001);
ids.npxsettings.onclick();window.test.sensitivityOptions.children[0].onclick();ids.npxclose.onclick();assert.equal(threshold,.001);
ids.npxinput.onclick();const beforeSettings=ids.npxnum.textContent;ids.npxsettings.onclick();callbacks.onNote({midi:target()});assert.equal(ids.npxnum.textContent,beforeSettings);
const beforeClose=starts;ids.npxclose.onclick();assert.equal(starts,beforeClose+1);
callbacks.onState('error','Microphone permission was denied.');assert(ids.npxletters.children.every(b=>!b.disabled));
assert.equal(ids.npxinput.attributes['aria-pressed'],'false');
ids.npxinput.onclick();document.hidden=true;documentEvents.visibilitychange();assert(ids.npxletters.children.every(b=>!b.disabled));
document.hidden=false;ids.npxinput.onclick();windowEvents.pagehide();assert(ids.npxletters.children.every(b=>!b.disabled));assert(stops>0);
console.log('Microphone-only grading, key feedback, quiet status, sensitivity, settings pause, denial and page cleanup passed.');
