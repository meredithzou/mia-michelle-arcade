// Touch piano view. It reports MIDI pitches; the game owns all answer rules.
(()=>{'use strict';
function keyName(m){
 const octave=Math.floor(m/12-1),names=[['C'],['C♯','D♭'],['D'],['D♯','E♭'],['E'],['F'],['F♯','G♭'],['G'],['G♯','A♭'],['A'],['A♯','B♭'],['B']];
 return names[m%12].map(n=>n+octave).join(' / ');
}
const isBlack=m=>[1,3,6,8,10].includes(m%12);
function create({container,onAnswer}){
 let currentLow,currentHigh;
 function reset(){for(const b of container.children){b.disabled=false;b.classList.remove('bad');b.classList.remove('good');b.classList.remove('show')}}
 function render(low,high){
  if(low===currentLow&&high===currentHigh){reset();return}
  currentLow=low;currentHigh=high;container.replaceChildren();
  let white=0,count=0;for(let m=low;m<=high;m++)if(!isBlack(m))count++;
  for(let m=low;m<=high;m++){
   const black=isBlack(m),b=document.createElement('button');b.type='button';
   b.dataset.midi=m;b.className=black?'piano-black':'piano-white';b.setAttribute('aria-label',keyName(m));
   b.style.left=(black?(white-.31)/count*100:white/count*100)+'%';
   if(!black){if(m%12===0){b.textContent=keyName(m);if(m===60)b.title='Middle C'}white++}
   b.onclick=()=>onAnswer(m);container.append(b);
  }
 }
 function mark(m,state){const b=[...container.children].find(b=>Number(b.dataset.midi)===m);if(b){b.classList.remove('bad');b.classList.add(state)}}
 function lock(m,state){mark(m,state);for(const b of container.children)b.disabled=true}
 return Object.freeze({render,mark,lock,name:keyName});
}
window.PlayThatNoteKeyboard=Object.freeze({create});
})();
