(()=>{const root=document.getElementById('npx');if(root.dataset.ready)return;root.dataset.ready='1';const $=id=>root.querySelector('#'+id),NS='http://www.w3.org/2000/svg',letters=window.ArcadeMusicPitch.letters;const {CL,H,el,lines,clef,note}=window.ArcadeMusicNotation;
const {name,midi}=window.ArcadeMusicPitch;
const init={mode:'treble',trebleMin:28,trebleMax:40,bassMin:16,bassMax:28,values:['quarter'],sound:true};
const practiceSettings=window.ArcadeSettings.create({
 key:'arcade.settings.name-the-note',version:1,defaults:init,
 normalize:(value,defaults)=>{
  const result={...defaults,values:[...defaults.values]};
  if(['treble','bass','both','grand'].includes(value.mode))result.mode=value.mode;
  for(const [c,low,high] of [['treble',21,46],['bass',10,35]]){
   const min=value[c+'Min'],max=value[c+'Max'];
   if(Number.isInteger(min)&&Number.isInteger(max)&&min>=low&&max<=high&&min<=max){
    result[c+'Min']=min;result[c+'Max']=max;
   }
  }
  if(Array.isArray(value.values)){
   const values=['quarter','half','whole'].filter(v=>value.values.includes(v));
   if(values.length)result.values=values;
  }
  if(typeof value.sound==='boolean')result.sound=value.sound;
  return result;
 }
});
let cfg=practiceSettings.load(),draft,q,total=0,correct=0,judged=false,locked=false,bag=[],last='',vcounts={},lastVal='',timer;
const audio=window.ArcadeMusicAudio.create({root,isEnabled:()=>cfg.sound,getQuestion:()=>q,onStateChange:()=>renderPianoState()});
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function draw(){let s=$('npxscore');s.replaceChildren();let grand=cfg.mode==='grand',parts=grand?[['treble',49],['bass',210]]:cfg.mode==='both'?[['treble',78],['bass',78]]:[[q.clef,78]],low=0,high=grand?345:255;for(let [c,y] of parts)for(let i of [cfg[c+'Min'],cfg[c+'Max']]){let cy=y+80-(i-(c==='treble'?30:18))*10;low=Math.min(low,cy-90);high=Math.max(high,cy+90)}s.setAttribute('viewBox',`0 ${low} 640 ${high-low}`);if(grand){lines(s,49);lines(s,210);clef(s,'treble',49);clef(s,'bass',210);el('line',{x1:72,x2:72,y1:49,y2:290,stroke:'#a496ba','stroke-width':2},s);note(s,q.clef,q.clef==='treble'?49:210,q.i,q.v)}else{lines(s,78);clef(s,q.clef,78);note(s,q.clef,78,q.i,q.v)}$('npxclefname').textContent=grand?'Grand Staff':q.clef==='treble'?'Treble clef':'Bass clef'}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a}
function pitch(){if(!bag.length){let cs=cfg.mode==='treble'?['treble']:cfg.mode==='bass'?['bass']:['treble','bass'];bag=shuffle(cs.flatMap(c=>Array.from({length:cfg[c+'Max']-cfg[c+'Min']+1},(_,j)=>c+':'+(cfg[c+'Min']+j))));if(bag.length>1&&bag.at(-1)===last){let k=bag.findIndex(x=>x!==last);[bag[k],bag[bag.length-1]]=[bag.at(-1),bag[k]]}}last=bag.pop();let [c,i]=last.split(':');return {clef:c,i:Number(i)}}
function val(){let min=Math.min(...cfg.values.map(v=>vcounts[v]||0)),ws=cfg.values.map(v=>Math.exp(-.45*((vcounts[v]||0)-min))*(v===lastVal?.78:1)),n=Math.random()*ws.reduce((a,b)=>a+b,0),v=cfg.values.at(-1);for(let j=0;j<ws.length;j++){n-=ws[j];if(n<0){v=cfg.values[j];break}}vcounts[v]=(vcounts[v]||0)+1;lastVal=v;return v}
function message(t,k=''){$('npxmsg').textContent=t;$('npxmsg').className='npx-msg '+k}
function next(){clearTimeout(timer);locked=judged=false;q={...pitch(),v:val()};let a=$('npxletters');a.replaceChildren();for(let l of letters){let b=document.createElement('button');b.textContent=l;b.onclick=()=>answer(l);a.append(b)}$('npxreveal').disabled=false;$('npxnext').hidden=true;message('Tap a letter to answer');draw()}
function restart(){clearTimeout(timer);total=correct=0;bag=[];last='';vcounts={};lastVal='';$('npxnum').textContent='0';$('npxacc').textContent='—';next()}
function grade(ok){if(judged)return;judged=true;total++;$('npxnum').textContent=total;if(ok)correct++;$('npxacc').textContent=Math.round(100*correct/total)+'%'}
function play(i){audio.play(midi(i))}
function wrong(){audio.wrong()}
function answer(l){if(locked)return;let ok=l===letters[q.i%7];grade(ok);let all=[...$('npxletters').children],b=all.find(x=>x.textContent===l);if(!ok){b.classList.add('bad');message('Not quite. Try again!','bad');wrong();return}locked=true;b.classList.add('good');all.forEach(x=>x.disabled=true);message('✓ Correct!','good');play(q.i);$('npxreveal').disabled=true;$('npxnext').hidden=false;timer=setTimeout(next,1150)}
$('npxreveal').onclick=()=>{if(locked)return;grade(false);locked=true;for(let b of $('npxletters').children){b.disabled=true;if(b.textContent===letters[q.i%7])b.classList.add('show')}message('Answer: '+name(q.i));play(q.i);$('npxreveal').disabled=true;$('npxnext').hidden=false};$('npxnext').onclick=next;$('npxrestart').onclick=restart;
function mute(){let b=$('npxmute');$('npxwaves').setAttribute('d',cfg.sound?'M16 9q4 3 0 6m2.5-9q6 6 0 12':'');b.setAttribute('aria-label',cfg.sound?'Mute sound':'Unmute sound')}
function setSound(enabled){
 cfg.sound=enabled;if(draft)draft.sound=enabled;audio.setEnabled(enabled);
 mute();if(!$('npxshade').hidden)settings();preparePiano(cfg);practiceSettings.save(cfg);
}
$('npxmute').onclick=()=>setSound(!cfg.sound);
function modeIcon(mode){let s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 156 130');function mini(c,x,y,w=116,step=10){for(let i=0;i<5;i++)el('line',{x1:x,x2:x+w,y1:y+i*step,y2:y+i*step,stroke:'#958da6','stroke-width':1.6},s);let z=(c==='treble'?.0045:.00575)*step;el('path',{d:CL[c],fill:'currentColor',transform:`translate(${x+6} ${y+(c==='treble'?4.45:4.7)*step}) scale(${z} ${-z})`},s)}if(mode==='treble')mini('treble',18,40,121,11);else if(mode==='bass')mini('bass',18,40,121,11);else if(mode==='both'){mini('treble',2,43,70,10);mini('bass',82,43,70,10)}else{mini('treble',20,13,116,10);mini('bass',20,81,116,10);el('line',{x1:17,x2:17,y1:13,y2:121,stroke:'#9e90b5','stroke-width':1.5},s)}return s}
function valueIcon(v){let s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 52 65'),w=v==='whole';el('path',{d:H[v],fill:'currentColor','fill-rule':'evenodd',transform:w?'translate(26 33) scale(.073 -.073) translate(-257 -134)':'translate(26 55) scale(.05 -.05) translate(-198.5 0)'},s);return s}
function range(c){let low=c==='treble'?21:10,high=c==='treble'?46:35,box=document.createElement('div');box.className='npx-range';let title=document.createElement('strong');title.textContent=(c==='treble'?'Treble':'Bass')+' range';title.style.color=c==='treble'?'#7352cc':'#258b91';box.append(title);let area=document.createElement('div'),left=document.createElement('div'),right=document.createElement('div'),s=document.createElementNS(NS,'svg');area.className='npx-rangeview';left.className='npx-steps';right.className='npx-steps high';s.setAttribute('viewBox','0 0 500 286');area.append(left,s,right);box.append(area);let labels=document.createElement('div'),a=document.createElement('span'),b=document.createElement('span');labels.className='npx-labels';labels.append(a,b);box.append(labels);let btns={};for(let [end,place] of [['Min',left],['Max',right]]){btns[end]=[];for(let [d,arrow] of [[1,'▲'],[-1,'▼']]){let bt=document.createElement('button');bt.textContent=arrow;bt.setAttribute('aria-label',`Move ${end==='Min'?'lowest':'highest'} ${d>0?'up':'down'}`);bt.onclick=()=>{let n=draft[c+end]+d;if(n<low||n>high||end==='Min'&&n>draft[c+'Max']||end==='Max'&&n<draft[c+'Min'])return;draft[c+end]=n;refresh()};place.append(bt);btns[end].push(bt)}}function refresh(){let mn=draft[c+'Min'],mx=draft[c+'Max'];a.textContent='LOWEST '+name(mn);b.textContent='HIGHEST '+name(mx);btns.Min[0].disabled=mn>=mx;btns.Min[1].disabled=mn<=low;btns.Max[0].disabled=mx>=high;btns.Max[1].disabled=mx<=mn;s.replaceChildren();lines(s,98,65,440);clef(s,c,98,75);note(s,c,98,mn,'whole',210,'#258b91',.1);note(s,c,98,mx,'whole',354,'#7352cc',.1)}refresh();return box}
function settings(){let modes=$('npxclefs');modes.replaceChildren();for(let [k,label] of [['treble','Treble'],['bass','Bass'],['both','Random'],['grand','Grand']]){let b=document.createElement('button'),t=document.createElement('span');t.textContent=label;b.append(modeIcon(k),t);b.className=draft.mode===k?'active':'';b.onclick=()=>{draft.mode=k;settings()};modes.append(b)}let ranges=$('npxranges');ranges.replaceChildren();for(let c of ['treble','bass'])if(draft.mode===c||draft.mode==='both'||draft.mode==='grand')ranges.append(range(c));let values=$('npxvalues');values.replaceChildren();for(let [v,label] of [['quarter','Quarter'],['half','Half'],['whole','Whole']]){let b=document.createElement('button'),t=document.createElement('span');t.textContent=label;b.append(valueIcon(v),t);b.className=draft.values.includes(v)?'active':'';b.onclick=()=>{if(draft.values.includes(v)){if(draft.values.length===1)return;draft.values=draft.values.filter(x=>x!==v)}else draft.values.push(v);settings()};values.append(b)}let sounds=$('npxsounds');sounds.replaceChildren();for(let [k,label] of [[true,'On'],[false,'Off']]){let b=document.createElement('button');b.textContent=label;b.className=draft.sound===k?'active':'';b.setAttribute('aria-pressed',String(draft.sound===k));b.onclick=()=>setSound(k);sounds.append(b)}}
$('npxsettings').onclick=()=>{clearTimeout(timer);draft={...cfg,values:[...cfg.values]};$('npxshade').hidden=false;settings()};$('npxclose').onclick=()=>{$('npxshade').hidden=true;if(locked)timer=setTimeout(next,900)};$('npxreset').onclick=()=>{draft={...init,values:[...init.values]};setSound(draft.sound)};$('npxapply').onclick=()=>{cfg={...draft,values:[...draft.values]};practiceSettings.save(cfg);$('npxshade').hidden=true;mute();restart()};mute();restart();
function practicePitches(c){
 const cs=c.mode==='treble'?['treble']:c.mode==='bass'?['bass']:['treble','bass'];
 return cs.flatMap(clef=>Array.from({length:c[clef+'Max']-c[clef+'Min']+1},(_,j)=>midi(c[clef+'Min']+j)));
}
function pianoReadiness(c){return audio.readiness(practicePitches(c))}
function renderPianoState(){
 const main=$('npxpianoState'),m=pianoReadiness(cfg);
 const ms=!cfg.sound?'off':m.state;
 main.dataset.state=ms;
 main.textContent=ms==='off'?'Sound off':ms==='ready'?'Piano sounds are ready':ms==='error'?'Piano unavailable':'Loading piano sounds…';
 main.setAttribute('aria-label',ms==='ready'?'Piano sounds ready for the current practice range':main.textContent);
 const c=$('npxshade').hidden?cfg:(draft||cfg),d=pianoReadiness(c),panel=$('npxloadpanel');
 panel.hidden=!c.sound;panel.dataset.state=d.state;
 $('npxloaddetail').textContent=d.state==='ready'?'Piano sounds are ready':d.state==='error'?'Some recordings could not load':'Loading piano sounds…';
 $('npxloadcount').textContent=d.done+'/'+d.total;
 $('npxloadprogress').max=d.total;$('npxloadprogress').value=d.done;
 $('npxloadhint').textContent=d.state==='ready'?'All recordings for this note range are ready.':d.state==='error'?'Unavailable recordings remain silent. Retry to load them.':'Sound is available once each recording is ready.';
 $('npxretry').hidden=d.state!=='error';
}
function preparePiano(c){audio.prepare(practicePitches(c),q?midi(q.i):null)}
const originalSettings=settings;
settings=function(){originalSettings();preparePiano(draft)};
for(const id of ['npxmute','npxclose','npxapply','npxrestart']){
 const old=$ (id).onclick;
 $(id).onclick=()=>{old();if(id==='npxapply'||id==='npxmute'&&cfg.sound)preparePiano(cfg);else renderPianoState()};
}
const originalRange=range;
range=function(c){const box=originalRange(c);for(const b of box.querySelectorAll('button')){const old=b.onclick;b.onclick=()=>{old();preparePiano(draft)}}return box};
$('npxretry').onclick=()=>{const c=$('npxshade').hidden?cfg:draft;audio.retry(practicePitches(c))};
renderPianoState();preparePiano(cfg);
})();
