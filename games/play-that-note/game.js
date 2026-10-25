(()=>{'use strict';const root=document.getElementById('npx');if(root.dataset.ready)return;root.dataset.ready='1';const $=id=>root.querySelector('#'+id),NS='http://www.w3.org/2000/svg',letters=window.ArcadeMusicPitch.letters;const {CL,H,el,lines,clef,note,accidental}=window.ArcadeMusicNotation;
const {name,midi}=window.ArcadeMusicPitch;
const init={mode:'treble',trebleMin:28,trebleMax:40,bassMin:16,bassMax:28,values:['quarter'],sound:true,accidentals:'mixed',input:'touch',sensitivity:window.ArcadePianoInput.defaultSensitivity};
const micThresholds=window.ArcadePianoInput.sensitivityThresholds;
const practiceSettings=window.ArcadeSettings.create({
 key:'arcade.settings.play-that-note',version:1,defaults:init,
 migrateLegacy:storage=>{
  const raw=storage.getItem('arcade.settings.find-that-note');
  if(raw===null)return null;
  const record=JSON.parse(raw);
  return record&&record.version===1?record.settings:null;
 },
 normalize:(value,defaults)=>{
  const result={...defaults,values:[...defaults.values]};
  if(['treble','bass'].includes(value.mode))result.mode=value.mode;
  for(const [c,low,high] of [['treble',28,42],['bass',14,28]]){
   const min=value[c+'Min'],max=value[c+'Max'];
   if(Number.isInteger(min)&&Number.isInteger(max)&&min>=low&&max<=high&&min<=max){
    result[c+'Min']=min;result[c+'Max']=max;
   }
  }
  if(Array.isArray(value.values)){
   const values=['quarter','half','whole'].filter(v=>value.values.includes(v));
   if(values.length)result.values=values;
  }
  if(['natural','sharp','flat','mixed'].includes(value.accidentals))result.accidentals=value.accidentals;
  if(typeof value.sound==='boolean')result.sound=value.sound;
  if(['touch','piano'].includes(value.input))result.input=value.input;
  if(Object.hasOwn(micThresholds,value.sensitivity))result.sensitivity=value.sensitivity;
  return result;
 }
});
let cfg=practiceSettings.load(),draft,q,total=0,correct=0,judged=false,locked=false,bag=[],last='',vcounts={},lastVal='',timer;
// Microphone capture always requires a fresh user gesture, even after reload.
cfg.input='touch';
const audio=window.ArcadeMusicAudio.create({root,isEnabled:()=>cfg.sound,getQuestion:()=>q,onStateChange:()=>renderPianoState()});
const keys=window.PlayThatNoteKeyboard.create({container:$('npxletters'),onAnswer:m=>{if(cfg.input==='touch')answer(m)}});
let micActive=false;
const mic=window.ArcadePianoInput.create({
 minRms:micThresholds[cfg.sensitivity],
 onState:(state,detail)=>{micActive=state==='listening';$('npxmicstatus').textContent=detail||({requesting:'Allow microphone access…',listening:'Microphone on',stopped:'Microphone off'}[state]||state);if(state==='error'){cfg.input='touch';if(!locked)message(inputPrompt())}inputUI()},
 onNote:p=>{if(cfg.input!=='piano'||locked||!$('npxshade').hidden)return;answer(p.midi)}
});
function inputUI(){
 const piano=cfg.input==='piano',b=$('npxinput');
 $('npxmic').hidden=false;root.dataset.input=cfg.input;
 b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>'+(!piano?'<path d="M3 3l18 18"/>':'')+'</svg>';
 b.setAttribute('aria-label',piano?'Turn microphone off':'Turn microphone on');
 b.setAttribute('aria-pressed',String(micActive));
 b.title=micActive?'Microphone on':'Microphone off';
 touchKeysUI();
}
// In microphone mode these keys are a display of the played note only.
function touchKeysUI(){for(const key of $('npxletters').children)key.disabled=cfg.input==='piano'||locked}
function inputPrompt(){return cfg.input==='piano'?'Play the right piano key on your physical piano':'Tap the matching piano key on the screen'}
const inputHint=document.createElement('p');
inputHint.className='npx-input-hint';
inputHint.style.cssText='margin:0 14px 12px;text-align:center;color:#847d97;font-size:12px;line-height:1.6';
inputHint.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" style="vertical-align:-3px;margin-right:4px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>Turn the microphone on to play your physical piano, or leave it off to tap the on-screen piano keys.';
$('npxmsg').after(inputHint);
$('npxinput').onclick=()=>{
 mic.stop();cfg.input=cfg.input==='piano'?'touch':'piano';
 if(draft)draft.input=cfg.input;practiceSettings.save(cfg);inputUI();
 if(!locked)message(inputPrompt());
 if(cfg.input==='piano')mic.start();
};
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
function draw(){
 const score=$('npxscore'),c=q.clef,staffY=78,base=c==='treble'?30:18;
 score.replaceChildren();let low=0,high=255;
 for(const i of [cfg[c+'Min'],cfg[c+'Max']]){
  const cy=staffY+80-(i-base)*10;low=Math.min(low,cy-90);high=Math.max(high,cy+90);
 }
 score.setAttribute('viewBox',`0 ${low} 640 ${high-low}`);
 lines(score,staffY);clef(score,c,staffY);note(score,c,staffY,q.i,q.v);accidental(score,c,staffY,q.i,q.a);
 $('npxclefname').textContent=c==='treble'?'Treble clef':'Bass clef';
}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]]}return a}
// A stable two-octave keyboard for the entire session, never shifted per question.
function bounds(c=cfg){return c.mode==='bass'?[36,60]:[60,84]}
function candidates(c=cfg){
 const [low,high]=bounds(c),as=c.accidentals==='natural'?[0]:c.accidentals==='sharp'?[0,1]:c.accidentals==='flat'?[0,-1]:[0,1,-1];
 const result=[];
 for(let i=c[c.mode+'Min'];i<=c[c.mode+'Max'];i++)for(const a of as){const m=midi(i)+a;if(m>=low&&m<=high)result.push({clef:c.mode,i,a,m})}
 return result;
}
function pitch(){
 if(!bag.length){bag=shuffle(candidates());if(bag.length>1&&bag.at(-1).m===last){const k=bag.findIndex(x=>x.m!==last);if(k>=0)[bag[k],bag[bag.length-1]]=[bag.at(-1),bag[k]]}}
 const p=bag.pop();last=p.m;return p;
}
function answerName(){return letters[q.i%7]+(q.a===1?'♯':q.a===-1?'♭':'')+Math.floor(q.i/7)}
function keyboard(){
 const [low,high]=bounds();keys.render(low,high);
 touchKeysUI();
 $('npxkeyhint').hidden=true;
}
function val(){let min=Math.min(...cfg.values.map(v=>vcounts[v]||0)),ws=cfg.values.map(v=>Math.exp(-.45*((vcounts[v]||0)-min))*(v===lastVal?.78:1)),n=Math.random()*ws.reduce((a,b)=>a+b,0),v=cfg.values.at(-1);for(let j=0;j<ws.length;j++){n-=ws[j];if(n<0){v=cfg.values[j];break}}vcounts[v]=(vcounts[v]||0)+1;lastVal=v;return v}
function message(t,k=''){$('npxmsg').textContent=t;$('npxmsg').className='npx-msg '+k}
function next(){clearTimeout(timer);mic.reset();locked=judged=false;q={...pitch(),v:val()};keyboard();$('npxreveal').disabled=false;$('npxnext').hidden=true;message(inputPrompt());draw()}
function restart(){clearTimeout(timer);total=correct=0;bag=[];last='';vcounts={};lastVal='';$('npxnum').textContent='0';$('npxacc').textContent='—';next()}
function grade(ok){if(judged)return;judged=true;total++;$('npxnum').textContent=total;if(ok)correct++;$('npxacc').textContent=Math.round(100*correct/total)+'%'}
function play(m){if(cfg.input!=='piano')audio.play(m)}
function wrong(){if(cfg.input!=='piano')audio.wrong()}
function answer(m){
 if(locked||!$('npxshade').hidden)return;const ok=m===q.m;grade(ok);
 // Keep the latest played key visible, including on a scrolled phone keyboard.
 for(const b of $('npxletters').children)b.classList.remove('bad');
 if(cfg.input==='piano'){
  const key=[...$('npxletters').children].find(b=>Number(b.dataset.midi)===m);
  if(key){const scroll=key.parentElement.parentElement;scroll.scrollLeft=key.offsetLeft-(scroll.clientWidth-key.offsetWidth)/2}
 }
 if(!ok){keys.mark(m,'bad');message(cfg.input==='piano'?(m<q.m?'Too low. Try a higher key.':'Too high. Try a lower key.'):'Not quite. Try again!','bad');wrong();return}
 locked=true;keys.lock(m,'good');
 message('✓ '+answerName()+' — correct!','good');play(q.m);$('npxreveal').disabled=true;$('npxnext').hidden=false;timer=setTimeout(next,1150);
}
$('npxreveal').onclick=()=>{
 if(locked)return;grade(false);locked=true;
 keys.lock(q.m,'show');
 message('Answer: '+answerName());play(q.m);$('npxreveal').disabled=true;$('npxnext').hidden=false;
};$('npxnext').onclick=next;$('npxrestart').onclick=restart;
function mute(){let b=$('npxmute');$('npxwaves').setAttribute('d',cfg.sound?'M16 9q4 3 0 6m2.5-9q6 6 0 12':'');b.setAttribute('aria-label',cfg.sound?'Mute sound':'Unmute sound')}
function setSound(enabled){
 cfg.sound=enabled;if(draft)draft.sound=enabled;audio.setEnabled(enabled);
 mute();if(!$('npxshade').hidden)settings();preparePiano(cfg);practiceSettings.save(cfg);
}
$('npxmute').onclick=()=>setSound(!cfg.sound);
function modeIcon(mode){let s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 156 130');function mini(c,x,y,w=116,step=10){for(let i=0;i<5;i++)el('line',{x1:x,x2:x+w,y1:y+i*step,y2:y+i*step,stroke:'#958da6','stroke-width':1.6},s);let z=(c==='treble'?.0045:.00575)*step;el('path',{d:CL[c],fill:'currentColor',transform:`translate(${x+6} ${y+(c==='treble'?4.45:4.7)*step}) scale(${z} ${-z})`},s)}if(mode==='treble')mini('treble',18,40,121,11);else if(mode==='bass')mini('bass',18,40,121,11);else if(mode==='both'){mini('treble',2,43,70,10);mini('bass',82,43,70,10)}else{mini('treble',20,13,116,10);mini('bass',20,81,116,10);el('line',{x1:17,x2:17,y1:13,y2:121,stroke:'#9e90b5','stroke-width':1.5},s)}return s}
function valueIcon(v){let s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 52 65');const w=v==='whole';el('path',{d:H[v],fill:'currentColor','fill-rule':'evenodd',transform:w?'translate(26 33) scale(.073 -.073) translate(-257 -134)':'translate(26 55) scale(.05 -.05) translate(-198.5 0)'},s);return s}
function range(c){let low=c==='treble'?28:14,high=c==='treble'?42:28,box=document.createElement('div');box.className='npx-range';let title=document.createElement('strong');title.textContent=(c==='treble'?'Treble':'Bass')+' range';title.style.color=c==='treble'?'#7352cc':'#258b91';box.append(title);let area=document.createElement('div'),left=document.createElement('div'),right=document.createElement('div'),s=document.createElementNS(NS,'svg');area.className='npx-rangeview';left.className='npx-steps';right.className='npx-steps high';s.setAttribute('viewBox','0 0 500 286');area.append(left,s,right);box.append(area);let labels=document.createElement('div'),a=document.createElement('span'),b=document.createElement('span');labels.className='npx-labels';labels.append(a,b);box.append(labels);let btns={};for(let [end,place] of [['Min',left],['Max',right]]){btns[end]=[];for(let [d,arrow] of [[1,'▲'],[-1,'▼']]){let bt=document.createElement('button');bt.textContent=arrow;bt.setAttribute('aria-label',`Move ${end==='Min'?'lowest':'highest'} ${d>0?'up':'down'}`);bt.onclick=()=>{let n=draft[c+end]+d;if(n<low||n>high||end==='Min'&&n>draft[c+'Max']||end==='Max'&&n<draft[c+'Min'])return;draft[c+end]=n;refresh()};place.append(bt);btns[end].push(bt)}}function refresh(){let mn=draft[c+'Min'],mx=draft[c+'Max'];a.textContent='LOWEST '+name(mn);b.textContent='HIGHEST '+name(mx);btns.Min[0].disabled=mn>=mx;btns.Min[1].disabled=mn<=low;btns.Max[0].disabled=mx>=high;btns.Max[1].disabled=mx<=mn;s.replaceChildren();lines(s,98,65,440);clef(s,c,98,75);note(s,c,98,mn,'whole',210,'#258b91',.1);note(s,c,98,mx,'whole',354,'#7352cc',.1)}refresh();return box}
function settings(){
 const acc=$('npxaccidentals');acc.replaceChildren();
 for(const [k,label] of [['natural','Naturals'],['sharp','Naturals + ♯'],['flat','Naturals + ♭'],['mixed','Naturals + ♯ + ♭']]){
  const b=document.createElement('button');b.textContent=label;b.className=draft.accidentals===k?'active':'';b.setAttribute('aria-pressed',String(draft.accidentals===k));b.onclick=()=>{draft.accidentals=k;settings()};acc.append(b);
 }
 let modes=$('npxclefs');modes.replaceChildren();for(let [k,label] of [['treble','Treble'],['bass','Bass']]){let b=document.createElement('button'),t=document.createElement('span');t.textContent=label;b.append(modeIcon(k),t);b.className=draft.mode===k?'active':'';b.onclick=()=>{draft.mode=k;settings()};modes.append(b)}let ranges=$('npxranges');ranges.replaceChildren();for(let c of ['treble','bass'])if(draft.mode===c||draft.mode==='both'||draft.mode==='grand')ranges.append(range(c));let values=$('npxvalues');values.replaceChildren();for(let [v,label] of [['quarter','Quarter'],['half','Half'],['whole','Whole']]){let b=document.createElement('button'),t=document.createElement('span');t.textContent=label;b.append(valueIcon(v),t);b.className=draft.values.includes(v)?'active':'';b.onclick=()=>{if(draft.values.includes(v)){if(draft.values.length===1)return;draft.values=draft.values.filter(x=>x!==v)}else draft.values.push(v);settings()};values.append(b)}let sounds=$('npxsounds');sounds.replaceChildren();for(let [k,label] of [[true,'On'],[false,'Off']]){let b=document.createElement('button');b.textContent=label;b.className=draft.sound===k?'active':'';b.setAttribute('aria-pressed',String(draft.sound===k));b.onclick=()=>setSound(k);sounds.append(b)}}
$('npxsettings').onclick=()=>{mic.stop();clearTimeout(timer);draft={...cfg,values:[...cfg.values]};$('npxshade').hidden=false;settings()};$('npxclose').onclick=()=>{$('npxshade').hidden=true;if(locked)timer=setTimeout(next,900)};$('npxreset').onclick=()=>{draft={...init,values:[...init.values]};setSound(draft.sound)};$('npxapply').onclick=()=>{cfg={...draft,values:[...draft.values]};practiceSettings.save(cfg);$('npxshade').hidden=true;mute();restart()};mute();restart();
function practicePitches(c){return candidates(c).map(p=>p.m)}
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
function preparePiano(c){audio.prepare(practicePitches(c),q?q.m:null)}
const originalSettings=settings;
const sensitivityHeading=document.createElement('h3');sensitivityHeading.textContent='Microphone sensitivity';
const sensitivityOptions=document.createElement('div');sensitivityOptions.className='npx-sounds';sensitivityOptions.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';sensitivityOptions.setAttribute('role','group');sensitivityOptions.setAttribute('aria-label','Microphone sensitivity');
const sensitivityHelp=document.createElement('p');sensitivityHelp.textContent='Higher sensitivity picks up quieter notes, but may also pick up more background noise.';
$('npxsounds').previousElementSibling.before(sensitivityHeading,sensitivityOptions,sensitivityHelp);
settings=function(){
 originalSettings();preparePiano(draft);sensitivityOptions.replaceChildren();
 for(const {id:value,label} of window.ArcadePianoInput.sensitivityOptions){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.className=draft.sensitivity===value?'active':'';button.setAttribute('aria-pressed',String(draft.sensitivity===value));
  button.onclick=()=>{draft.sensitivity=value;settings()};sensitivityOptions.append(button);
 }
};
for(const id of ['npxmute','npxclose','npxapply','npxrestart']){
 const old=$ (id).onclick;
 $(id).onclick=()=>{old();if(id==='npxapply'||id==='npxmute'&&cfg.sound)preparePiano(cfg);else renderPianoState()};
}
const originalRange=range;
range=function(c){const box=originalRange(c);for(const b of box.querySelectorAll('button')){const old=b.onclick;b.onclick=()=>{old();preparePiano(draft)}}return box};
$('npxretry').onclick=()=>{const c=$('npxshade').hidden?cfg:draft;audio.retry(practicePitches(c))};
inputUI();
const applyInput=$('npxapply').onclick;$('npxapply').onclick=()=>{mic.stop();applyInput();mic.setThreshold(micThresholds[cfg.sensitivity]);inputUI();if(cfg.input==='piano')mic.start()};
const closeInput=$('npxclose').onclick;$('npxclose').onclick=()=>{closeInput();if(cfg.input==='piano')mic.start()};
function stopMicrophoneInput(){mic.stop();cfg.input='touch';if(draft)draft.input='touch';inputUI();if(!locked)message(inputPrompt())}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMicrophoneInput()});
window.addEventListener('pagehide',stopMicrophoneInput);
renderPianoState();preparePiano(cfg);
})();
