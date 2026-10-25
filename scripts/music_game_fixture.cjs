/**
 * Shared test fixture for the three music games.
 * Provides a minimal fake DOM and VM context, loads each game's actual
 * scripts, and optionally substitutes deterministic audio. This lets
 * regression tests run in Node without a browser or network access.
 * Not a standalone test; imported by the music-game test scripts.
 */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.hidden=false;this.disabled=false;this.className='';this.textContent='';this.listeners={};this.classList={add:(c)=>{this.className+=' '+c},remove:(c)=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ')}}}
 append(...xs){for(const x of xs){x.parentElement=this;this.children.push(x)}}
 before(...xs){this.adjacentBefore=xs}
 after(...xs){this.adjacentAfter=xs}
 replaceChildren(...xs){this.children=xs}
 setAttribute(k,v){this.attributes[k]=String(v)}
 addEventListener(k,f){this.listeners[k]=f}
 removeEventListener(k){delete this.listeners[k]}
 querySelectorAll(tag){return this.children.flatMap(x=>[...(x.tagName===tag?[x]:[]),...x.querySelectorAll(tag)])}
}
function fixture(game='name-that-note', options={}){
 const html=read(`games/${game}/index.html`),ids={};for(const [,id] of html.matchAll(/id="([^"]+)"/g))ids[id]=new Element();
 ids.npx.querySelector=s=>ids[s.slice(1)];ids.npxshade.hidden=true;
 // The fixture has a flat ID map; model only the new controls' surrounding nodes.
 if(game==='play-that-note'){
  ids.npxsounds.previousElementSibling=new Element('h3');
  ids.npxletters.parentElement=new Element();
 }
 const document={hidden:false,getElementById:id=>ids[id],createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),addEventListener(){}};
 const window={addEventListener(){},localStorage:null},ctx={window,document,navigator:{},setTimeout:()=>1,clearTimeout(){},fetch:()=>Promise.reject(Error('offline fixture')),AbortController,console};
 vm.createContext(ctx);
 for(const [,src] of html.matchAll(/<script src="([^"]+)"><\/script>/g)){if(src.includes('analytics/'))continue;const file=path.posix.normalize(`games/${game}/${src}`);if(src!=='game.js')vm.runInContext(read(file),ctx);}
 if(options.audio)window.ArcadeMusicAudio={create:options.audio};
 let code=read(`games/${game}/game.js`);
 code=code.replace('})();',`window.test={get q(){return q},get cfg(){return cfg},get locked(){return locked},next,restart,${game==='play-that-note'?'candidates,bounds,keyboard,':game==='do-i-have-absolute-pitch'?'candidates,bounds,playPitch,renderPianoState,':''} };})();`);
 vm.runInContext(code,ctx);return {ctx,ids,game:window.test};
}

module.exports={fixture,Element};
