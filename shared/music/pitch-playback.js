// Shared decorative pitch ripples. Identical motion for every note, no pitch clue.
(()=>{'use strict';
function create({root,button}){
 const paper=button.parentElement;let ripple=null,fronts=[],animations=[],timer,ticket=0;
 if(paper){
  ripple=document.createElement('div');ripple.className='pitch-ripple';ripple.setAttribute('aria-hidden','true');
  let shape='';for(let x=0;x<=200;x+=2){const u=x/200,y=48-25*Math.sin(4*Math.PI*u)*Math.sin(Math.PI*u)**2;shape+=(x?'L':'M')+x+','+y.toFixed(3)}
  fronts=[-1,1].map(direction=>{
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');
   svg.setAttribute('class','pitch-wave-front');svg.setAttribute('viewBox','0 0 200 96');path.setAttribute('d',shape);
   // Keep the existing asymmetric sine orientation on both outgoing fronts.
   svg.append(path);ripple.append(svg);return {element:svg,direction};
  });paper.prepend(ripple);
 }
 function stop(){ticket++;clearTimeout(timer);root.dataset.pitchPlaying='false';for(const animation of animations)animation.cancel();animations=[];}
 function start(){
  stop();root.dataset.pitchPlaying='true';const current=ticket;timer=setTimeout(stop,2450);
  if(!ripple||typeof ripple.animate!=='function'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  ripple.style.top=(button.offsetTop+button.offsetHeight/2)+'px';
  const half=paper.clientWidth/2,origin=button.offsetWidth/2-32,options={duration:2450,easing:'linear',fill:'both'};
  for(const {element,direction} of fronts){const start=direction*origin-100,end=direction*(half+110)-100;
   animations.push(element.animate([
    {transform:'translate3d('+start+'px,0,0) scaleY(1)',offset:0},
    {transform:'translate3d('+(start+(end-start)*.42)+'px,0,0) scaleY(.55)',offset:.42},
    {transform:'translate3d('+(start+(end-start)*.8)+'px,0,0) scaleY(.14)',offset:.8},
    {transform:'translate3d('+end+'px,0,0) scaleY(0)',offset:1}
   ],options));
  }
  const fade=ripple.animate([{opacity:0,offset:0},{opacity:.72,offset:.04},{opacity:.52,offset:.35},{opacity:.2,offset:.7},{opacity:0,offset:1}],options);
  animations.push(fade);fade.finished.then(()=>{if(current===ticket)stop()}).catch(()=>{});
 }
 return Object.freeze({start,stop});
}
window.ArcadePitchPlayback=Object.freeze({create});
})();
