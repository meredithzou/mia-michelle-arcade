// Run with node scripts/test_find_that_note.cjs. Tests the real game script using a small DOM fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.hidden=false;this.disabled=false;this.className='';this.textContent='';this.listeners={};this.classList={add:(c)=>{this.className+=' '+c},remove:(c)=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ')}}}
 append(...xs){this.children.push(...xs)}
 replaceChildren(...xs){this.children=xs}
 setAttribute(k,v){this.attributes[k]=String(v)}
 addEventListener(k,f){this.listeners[k]=f}
 removeEventListener(k){delete this.listeners[k]}
 querySelectorAll(tag){return this.children.flatMap(x=>[...(x.tagName===tag?[x]:[]),...x.querySelectorAll(tag)])}
}
function fixture(game='find-that-note'){
 const html=read(`games/${game}/index.html`),ids={};for(const [,id] of html.matchAll(/id="([^"]+)"/g))ids[id]=new Element();
 ids.npx.querySelector=s=>ids[s.slice(1)];ids.npxshade.hidden=true;
 const document={hidden:false,getElementById:id=>ids[id],createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),addEventListener(){}};
 const window={addEventListener(){},localStorage:null},ctx={window,document,navigator:{},setTimeout:()=>1,clearTimeout(){},fetch:()=>Promise.reject(Error('offline fixture')),AbortController,console};
 vm.createContext(ctx);for(const file of ['shared/settings.js','shared/music-notation.js'])vm.runInContext(read(file),ctx);
 let code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
 code=code.replace('})();',`window.test={get q(){return q},get cfg(){return cfg},get locked(){return locked},next,restart,${game==='find-that-note'?'candidates,bounds,keyboard,':''} };})();`);
 vm.runInContext(code,ctx);return {ctx,ids,game:window.test};
}
const {ctx,ids,game:g}=fixture();
assert.equal(ids.npxletters.children.length,25);assert.equal(ids.npxletters.children.filter(x=>x.className==='piano-black').length,10);
assert.equal(ids.npxletters.children.filter(x=>x.className==='piano-white').length,15);
const music=ctx.window.ArcadeMusic;
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
const original=fixture('name-the-note');assert.equal(original.ids.npxletters.children.length,7);assert.ok(original.ids.npxscore.children.length>5);
console.log('Find That Note tests passed: all range combinations, 25 keys, accidentals, enharmonics, exact octave, scoring, reveal, clef change, and original game startup.');
