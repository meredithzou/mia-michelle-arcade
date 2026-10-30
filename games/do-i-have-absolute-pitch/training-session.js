// Family practice checkpoints: 30 trials with feedback and a five-second answer
// window. These are our choices, not the paper's complete training protocol.
(()=>{'use strict';
const ROUND_SIZE=30,ANSWER_MS=5000,LOW=60,HIGH=95;
const ORDER=[5,4,6,3,7,2,8,1,9,0,10,11],NAMES=['C','D♭','D','E♭','E','F','F♯','G','G♯','A','B♭','B'];
const notesFor=classes=>Array.from({length:HIGH-LOW+1},(_,i)=>LOW+i).filter(m=>classes.includes(m%12));
const stages=Object.freeze(ORDER.map((added,index)=>{
 const classes=ORDER.slice(0,index+1),low=Math.min(...classes),high=Math.max(...classes);
 const others=[...new Set([low-2,low-1,high+1,high+2].map(n=>(n+12)%12))].filter(n=>!classes.includes(n)).sort((a,b)=>a-b);
 const targets=Object.freeze(notesFor(classes)),pool=Object.freeze(notesFor([...classes,...others]));
 return Object.freeze({index,added,name:NAMES[added],classes:Object.freeze(classes),others:Object.freeze(others),targets,pool});
}));
const POOL=stages[0].pool,TARGETS=stages[0].targets;
function createSession({now=()=>performance.now(),random=Math.random,limit=ANSWER_MS,stage=0}={}){
 const config=stages[stage]||stages[0],targets=config.targets,others=config.pool.filter(m=>!targets.includes(m));
 const shuffle=notes=>{const copy=[...notes];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy};
 const sample=(notes,count)=>{let picked=[];while(picked.length<count)picked.push(...shuffle(notes).slice(0,count-picked.length));return picked};
 let bag=[],current=null,opened=null,results=[];
 function next(){if(current!==null)throw Error('A trial is already active');
  if(results.length>=ROUND_SIZE)return null;
  if(!bag.length)bag=shuffle([...sample(targets,others.length?ROUND_SIZE/2:ROUND_SIZE),...(others.length?sample(others,ROUND_SIZE/2):[])]);
  current=bag.pop();opened=null;return current;
 }
 function open(){if(current===null||opened!==null)return false;opened=now();return true}
 function answer(choice){if(current===null||opened===null)return null;
  const rt=Math.max(0,now()-opened),target=targets.includes(current),timeout=choice===null||rt>=limit;
  if(choice!==null&&choice!==false&&!targets.includes(choice))return null;
  const octaveError=!timeout&&target&&typeof choice==='number'&&choice!==current&&choice%12===current%12;
  const row={midi:current,target,choice:timeout?null:choice,correct:!timeout&&(target?choice===current:choice===false),octaveError,rt:timeout?null:rt,timeout};
  results.push(row);current=null;opened=null;return row;
 }
 function stats(){const correct=results.filter(r=>r.correct),ts=results.filter(r=>r.target),ns=results.filter(r=>!r.target);
  const accuracy=rows=>rows.length?rows.filter(r=>r.correct).length/rows.length:null;
  return {answered:results.length,correct:correct.length,accuracy:accuracy(results),targetAccuracy:accuracy(ts),nonTargetAccuracy:accuracy(ns),targetCount:ts.length,nonTargetCount:ns.length,timeouts:results.filter(r=>r.timeout).length,octaveErrors:results.filter(r=>r.octaveError).length,meanCorrectRt:correct.length?correct.reduce((s,r)=>s+r.rt,0)/correct.length:null};
 }
 return Object.freeze({next,open,answer,stats,cancel(){if(current!==null)bag.unshift(current);current=null;opened=null},remaining(){return opened===null?limit:Math.max(0,limit-(now()-opened))},reset(){bag=[];current=null;opened=null;results=[]}});
}
window.ArcadePitchTraining=Object.freeze({createSession,stages,names:Object.freeze(NAMES),roundSize:ROUND_SIZE,answerMs:ANSWER_MS,low:LOW,high:HIGH,pool:POOL,targets:TARGETS});
})();
