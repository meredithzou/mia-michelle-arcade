// Exercises the game's real UI handlers and preferences using small DOM stubs.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(seed={},blocked=false){
 const records=new Map(Object.entries(seed)),ids={},buttons=['.012','.003','.001'].map(v=>({dataset:{threshold:v},attributes:{},setAttribute(k,v){this.attributes[k]=v}}));
 for(const id of ['toggle','togglelabel','status','prompt','level','live','note','alternate','frequency','notevolume'])ids[id]={textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v}};
 let callbacks,starts=0,stops=0,threshold;const events={};
 const window={localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return records.get(k)??null},setItem:(k,v)=>{if(blocked)throw Error('blocked');records.set(k,v)}},addEventListener:(k,f)=>events[k]=f};
 const context={window,document:{getElementById:id=>ids[id],querySelectorAll:()=>buttons},performance:{now:()=>1000}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('shared/settings.js','utf8'),context);
 context.ArcadePianoInput={create(opts){callbacks=opts;return {start(){starts++;opts.onState('listening')},stop(){stops++;opts.onState('stopped')},setThreshold(v){threshold=v}}}};
 vm.runInContext(fs.readFileSync('games/piano-note-finder/game.js','utf8'),context);
 return {records,ids,buttons,events,get callbacks(){return callbacks},get starts(){return starts},get stops(){return stops},get threshold(){return threshold}};
}
const f=fixture();assert.equal(f.starts,0);assert.equal(f.buttons[1].attributes['aria-pressed'],'true');
f.ids.toggle.onclick();assert.equal(f.starts,1);assert.equal(f.ids.toggle.attributes['aria-pressed'],'true');
f.callbacks.onNote({midi:73,frequency:554.4,rms:.01});assert.equal(f.ids.note.textContent,'C♯5');assert.equal(f.ids.alternate.textContent,'also D♭5');assert.equal(f.ids.notevolume.textContent,'-40 dBFS');
f.callbacks.onLevel(.001);assert.equal(f.ids.live.textContent,'-60 dBFS');
f.buttons[2].onclick();assert.equal(f.threshold,.001);
const restored=fixture(Object.fromEntries(f.records));assert.equal(restored.callbacks.minRms,.001);assert.equal(restored.starts,0);
f.ids.toggle.onclick();assert.equal(f.stops,1);f.events.pagehide();assert.equal(f.stops,2);
assert.equal(fixture({'arcade.settings.piano-note-finder':'broken'}).callbacks.minRms,.003);
assert.equal(fixture({},true).callbacks.minRms,.003);
console.log('Piano Note Finder passed: explicit Listen/Stop, C♯5/D♭5, frequency/volume, sensitivity save/restore, corrupt/blocked storage, cleanup.');
