// Run with node scripts/test_play_that_note.cjs. Tests the real game script using a small DOM fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {fixture}=require('./music_game_fixture.cjs');
const {ctx,ids,game:g}=fixture('play-that-note');
assert.equal(ids.npxletters.children.length,25);assert.equal(ids.npxletters.children.filter(x=>x.className==='piano-black').length,10);
assert.equal(ids.npxletters.children.filter(x=>x.className==='piano-white').length,15);
const music=ctx.window.ArcadeMusicPitch;
assert.equal(music.midi(28),60);assert.equal(music.midi(30)+1,65); // E#4 = F4
assert.equal(music.midi(28)-1,59); // Cb4 = B3 (outside treble keyboard)
assert.equal(music.midi(34)+1,72); // B#4 = C5
for(const mode of ['treble','bass'])for(const accidentals of ['natural','sharp','flat','mixed']){
 const low=mode==='treble'?28:14,high=low+14;
 for(let min=low;min<=high;min++)for(let max=min;max<=high;max++){
  const c={...g.cfg,mode,accidentals,[mode+'Min']:min,[mode+'Max']:max},[lo,hi]=g.bounds(c),ps=g.candidates(c);
  assert.ok(ps.length);for(const p of ps){assert.ok(p.m>=lo&&p.m<=hi);assert.equal(p.m,music.midi(p.i)+p.a)}
 }
}
// Exact octave matters; a wrong attempt counts once, then correction retains 0%.
const find=m=>ids.npxletters.children.find(b=>Number(b.dataset.midi)===m);
let target=g.q.m,wrong=target>=72?target-12:target+12;
find(wrong).onclick();assert.equal(ids.npxnum.textContent,1);assert.equal(ids.npxacc.textContent,'0%');assert.equal(g.locked,false);
find(target).onclick();assert.equal(g.locked,true);assert.equal(ids.npxacc.textContent,'0%');assert.ok(find(target).className.includes('good'));
g.restart();target=g.q.m;find(target).onclick();assert.equal(ids.npxacc.textContent,'100%');
g.next();ids.npxreveal.onclick();assert.equal(g.locked,true);assert.ok(find(g.q.m).className.includes('show'));
// Exercise a full shuffled bag: black and white targets, octave spellings, visible keys.
let seenBlack=false,seenWhite=false,seenSharp=false,seenFlat=false;
for(let n=0;n<80;n++){g.next();const q=g.q,b=find(q.m);assert.ok(b);seenBlack||=b.className==='piano-black';seenWhite||=b.className==='piano-white';seenSharp||=q.a===1;seenFlat||=q.a===-1;b.onclick();assert.equal(g.locked,true)}
assert.ok(seenBlack&&seenWhite&&seenSharp&&seenFlat);
ids.npxsettings.onclick();const bass=ids.npxclefs.children[1];bass.onclick();ids.npxapply.onclick();assert.equal(g.cfg.mode,'bass');assert.equal(Number(ids.npxletters.children[0].dataset.midi),36);
// Regression: the original game still starts, draws a staff, and offers C–B.
const original=fixture('name-that-note');assert.equal(original.ids.npxletters.children.length,7);assert.ok(original.ids.npxscore.children.length>5);


// Reuse keys across questions; Settings must block answer input.
g.next();const buttons=[...ids.npxletters.children];g.next();
assert.ok(buttons.every((b,i)=>b===ids.npxletters.children[i]));
ids.npxsettings.onclick();const before=ids.npxnum.textContent;find(g.q.m).onclick();
assert.equal(g.locked,false);assert.equal(ids.npxnum.textContent,before);ids.npxclose.onclick();
assert.equal(ctx.w,undefined,'note-value icons must not create a global variable');

console.log('Play That Note tests passed: all range combinations, 25 keys, accidentals, enharmonics, exact octave, scoring, reveal, clef change, and original game startup.');
