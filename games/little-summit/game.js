
const c=document.getElementById('c'),ctx=c.getContext('2d'),$=id=>document.getElementById(id);const levels=[{name:"Easy",count:12,sway:95,size:25,hit:45,info:"Big holds and a glowing guide."},{name:"Medium",count:15,sway:155,size:21,hit:33,info:"More holds. Find the next one yourself!"},{name:"Hard",count:18,sway:225,size:17,hit:25,info:"A climbing maze! Follow chalk links, plan ahead, and backtrack out of dead ends."}];let difficulty=0,attempts=0,winTimer,route=0,step=0,moves=0,holds=[],anim=0,hintUntil=0,px=360,py=740,tx=360,ty=740;const colors=['#9164bd','#42a6b7','#e89450'];const names=['purple','blue','orange'];
let maze=[],current=0,goal=0,visited=new Set(),hintNode=-1,finished=false;
// A seeded perfect maze: one route to the summit, with branches to explore.
function makeMaze(){
  let seed=137+route*919;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  holds=[];maze=Array.from({length:48},()=>[]);
  for(let row=0;row<8;row++)for(let col=0;col<6;col++)holds.push({x:100+col*104,y:120+row*83,color:colors[route]});
  current=45;const stack=[current],seen=new Set(stack);
  while(stack.length){const n=stack[stack.length-1],r=Math.floor(n/6),col=n%6;
    const options=[r>0?n-6:-1,r<7?n+6:-1,col>0?n-1:-1,col<5?n+1:-1].filter(v=>v>=0&&!seen.has(v));
    if(!options.length){stack.pop();continue}const next=options[Math.floor(random()*options.length)];maze[n].push(next);maze[next].push(n);seen.add(next);stack.push(next);
  }
  // Pick the top-row summit with the longest journey from the start.
  const distances=Array(48).fill(-1),queue=[current];distances[current]=0;
  for(const n of queue)for(const v of maze[n])if(distances[v]<0){distances[v]=distances[n]+1;queue.push(v)}
  goal=Array.from({length:6},(_,i)=>i).sort((a,b)=>distances[b]-distances[a])[0];
  visited=new Set([current]);px=tx=holds[current].x;py=ty=holds[current].y+35;
}
function nextOnPath(){const queue=[[current]],seen=new Set([current]);for(const path of queue){const n=path[path.length-1];if(n===goal)return path[1]??current;for(const v of maze[n])if(!seen.has(v)){seen.add(v);queue.push([...path,v])}}return current}
function mazeMove(i){
  if(finished||!maze[current].includes(i))return false;
  current=i;visited.add(i);moves++;hintNode=-1;hintUntil=0;tx=holds[i].x;ty=holds[i].y+35;finished=current===goal;update();
  if(finished)celebrate();else $('msg').textContent=maze[current].length===1?'Dead end! Climb back to the last fork.':'Look ahead: which chalk link leads toward the flag?';return true;
}
function celebrate(){winTimer=setTimeout(()=>{$('result').textContent=levels[difficulty].name+' conquered in '+moves+' moves and '+attempts+' retries!';$('overlay').classList.add('show')},700)}
function reset(){finished=false;hintNode=-1;clearTimeout(winTimer);hintUntil=0;attempts=0;step=0;moves=0;holds=[];px=tx=360;py=ty=740;for(let i=0;i<levels[difficulty].count;i++){let x=360+Math.sin(i*1.75+route*1.4)*levels[difficulty].sway;holds.push({x,y:705-i*(583/(levels[difficulty].count-1)),color:colors[route],i});} if(difficulty===2)makeMaze();$('overlay').classList.remove('show');$('helpText').textContent=difficulty===2?'Follow the chalk links between holds. Some branches end! You can move sideways, down, or back to a fork. Reach the flag.':'Climb the holds in your route’s color, from bottom to top. Easy shows the next hold. Tap ✦ for a hint.';$('keys').textContent=difficulty===2?'⌨️ Arrow keys choose a direction.':'⌨️ You can also use ↑ or Space.';update();}
function update(){
 const progress=difficulty===2?(holds[45].y-holds[current].y)/(holds[45].y-holds[goal].y):step/levels[difficulty].count;
 $('height').textContent=(Math.max(0,progress)*18).toFixed(1)+' m';$('progress').style.width=Math.max(0,progress)*100+'%';
 $('moves').textContent=moves+' moves · '+attempts+' retries';
 $('msg').textContent=difficulty===2?(finished?'You did it!':'Plan your route through the chalk links.'):step===0?'Follow the '+names[route]+' holds.':step===levels[difficulty].count?'You did it!':difficulty===0?'Great move! Reach for the next glow.':'Great move! Find the next '+names[route]+' hold.';
}
function move(i){if(difficulty===2)return mazeMove(i);if(i!==step||step>=levels[difficulty].count)return;tx=holds[i].x;ty=holds[i].y+35;step++;moves++;update();if(step===levels[difficulty].count)winTimer=setTimeout(()=>{$('result').textContent=levels[difficulty].name+' conquered! 18 meters in '+moves+' moves and '+attempts+' retries.';$('overlay').classList.add('show')},700)}
c.addEventListener('pointerdown',e=>{
 const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*720/r.width,y=(e.clientY-r.top)*820/r.height;
 if(difficulty===2){if(finished)return;const i=holds.findIndex(h=>Math.hypot(h.x-x,h.y-y)<30);if(i===current)return;if(i>=0&&mazeMove(i))return;attempts++;update();$('msg').textContent='That hold has no chalk link from here. Try another direction!';return}
 const h=holds[step];if(h&&Math.hypot(h.x-x,h.y-y)<levels[difficulty].hit)move(step);else if(h){attempts++;update();$('msg').textContent='Try the next '+names[route]+' hold above you!';if(difficulty===0)hintUntil=performance.now()+1500}
});
document.addEventListener('keydown',e=>{
 if(['BUTTON','SELECT'].includes(document.activeElement.tagName))return;
 if(difficulty===2){const delta={ArrowUp:-6,ArrowDown:6,ArrowLeft:-1,ArrowRight:1}[e.code];if(delta){e.preventDefault();mazeMove(current+delta)}return}
 if(e.code==='ArrowUp'||e.code==='Space'){e.preventDefault();move(step)}
});
$('restart').onclick=reset;$('difficulty').onchange=e=>{difficulty=+e.target.value;$('levelInfo').textContent=levels[difficulty].info;reset()};$('route').onchange=e=>{route=+e.target.value;reset()};$('hint').onclick=()=>{if(difficulty===2){if(finished)return;hintNode=nextOnPath()}hintUntil=performance.now()+2500;$('msg').textContent='Tap the hold with the sparkling ring!'};$('next').onclick=()=>{route=(route+1)%3;$('route').value=route;reset()};
function line(x,y,x2,y2,color,w){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function hold(x,y,color,size=20){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(x+y)*.5);ctx.fillStyle='#0002';ctx.beginPath();ctx.ellipse(2,5,size+2,size*.68,0,0,7);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-size,4);ctx.quadraticCurveTo(-size-5,-size*.8,-4,-size*.65);ctx.quadraticCurveTo(size,-size,size,1);ctx.quadraticCurveTo(size*.7,size*.7,-size,4);ctx.fill();ctx.fillStyle='#fff5';ctx.beginPath();ctx.ellipse(-4,-5,7,3,-.2,0,7);ctx.fill();ctx.fillStyle='#0004';ctx.beginPath();ctx.arc(2,1,2.4,0,7);ctx.fill();ctx.restore()}
function draw(t){ctx.clearRect(0,0,720,820);ctx.fillStyle='#ddd3c6';ctx.fillRect(0,0,720,820);ctx.fillStyle='#cbbfae';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(240,0);ctx.lineTo(140,820);ctx.lineTo(0,820);ctx.fill();ctx.fillStyle='#e9e0d3';ctx.beginPath();ctx.moveTo(550,0);ctx.lineTo(720,0);ctx.lineTo(720,820);ctx.lineTo(620,820);ctx.lineTo(490,400);ctx.fill();for(let x=35;x<720;x+=65)for(let y=40;y<780;y+=65){ctx.fillStyle='#a79d8c66';ctx.beginPath();ctx.arc(x,y,2,0,7);ctx.fill()}ctx.fillStyle='#b5c5ac';ctx.fillRect(0,785,720,35);ctx.fillStyle='#637b62';ctx.font='bold 14px system-ui';ctx.textAlign='left';ctx.fillText('THE LITTLE SUMMIT CLIMBING CLUB',24,808);
if(difficulty===2){for(let i=0;i<maze.length;i++)for(const v of maze[i])if(v>i)line(holds[i].x,holds[i].y,holds[v].x,holds[v].y,'#fff9',5)}
for(let i=0;i<(difficulty===2?0:23);i++){let x=45+(i*173)%630,y=90+(i*97)%635;if(!holds.some(h=>Math.hypot(h.x-x,h.y-y)<55))hold(x,y,['#e1ad69','#7f9b83','#bd7d73'][i%3],16)}
holds.forEach((h,i)=>{if(difficulty===2?(i===current||(i===hintNode&&t<hintUntil)):(i===step&&(difficulty===0||t<hintUntil))){ctx.strokeStyle=t<hintUntil?'#fffbd0':'#ffffffaa';ctx.lineWidth=t<hintUntil?5:3;ctx.beginPath();ctx.arc(h.x,h.y,30+Math.sin(t/240)*4,0,7);ctx.stroke()}hold(h.x,h.y,(difficulty===2?visited.has(i):i<step)?'#6f8d76':h.color,levels[difficulty].size);if(difficulty===2?visited.has(i):i<step){ctx.fillStyle='white';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('✓',h.x,h.y+5)}});let top=holds[difficulty===2?goal:holds.length-1];line(top.x+30,top.y+3,top.x+30,top.y-48,'#53675b',4);ctx.fillStyle='#f9edba';ctx.beginPath();ctx.moveTo(top.x+30,top.y-48);ctx.lineTo(top.x+70,top.y-36);ctx.lineTo(top.x+30,top.y-23);ctx.fill();
px+=(tx-px)*.12;py+=(ty-py)*.12;let x=px,y=py;line(360,0,x,y+25,'#f2bd69',3);line(x,y+18,x-21,y+47,'#374d58',12);line(x,y+18,x+23,y+45,'#374d58',12);line(x-21,y+47,x-32,y+46,'#353634',11);line(x+23,y+45,x+34,y+44,'#353634',11);line(x,y-8,x-24,y-21,'#f1b587',11);line(x-24,y-21,x-20,y-40,'#f1b587',9);line(x+1,y-8,x+22,y-26,'#f1b587',11);line(x+22,y-26,x+5,y-35,'#f1b587',9);line(x,y-13,x,y+18,'#e98c66',26);line(x-12,y+13,x+12,y+13,'#3b6867',5);ctx.fillStyle='#f1b587';ctx.beginPath();ctx.arc(x,y-34,15,0,7);ctx.fill();ctx.fillStyle='#365549';ctx.beginPath();ctx.arc(x,y-40,17,Math.PI,Math.PI*2);ctx.fill();line(x-17,y-40,x+17,y-40,'#365549',5);ctx.fillStyle='#fff7';ctx.beginPath();ctx.ellipse(x-5,y-48,6,2,-.3,0,7);ctx.fill();requestAnimationFrame(draw)}reset();requestAnimationFrame(draw);
