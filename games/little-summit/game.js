
const c=document.getElementById('c'),ctx=c.getContext('2d'),$=id=>document.getElementById(id);const levels=[{name:"Easy",count:12,sway:95,size:25,hit:45,info:"Big holds and a glowing guide."},{name:"Medium",count:15,sway:155,size:21,hit:33,info:"More holds. Find the next one yourself!"},{name:"Hard",count:18,sway:225,size:17,hit:25,info:"Move each hand and foot. Raise your feet, balance, then stretch higher."}];let difficulty=0,attempts=0,winTimer,route=0,step=0,moves=0,holds=[],anim=0,hintUntil=0,px=360,py=740,tx=360,ty=740;const colors=['#9164bd','#42a6b7','#e89450'];const names=['purple','blue','orange'];
const limbNames=['Left hand','Right hand','Left foot','Right foot'];
const limbLabels=['LH','RH','LF','RF'];
let contacts=[],selected=0,body={x:360,y:680},goal=0,hintNode=-1,finished=false;
function makeClimb(){
 holds=[];
 for(let row=0;row<10;row++)for(let col=0;col<6;col++){
  const offset=route===0?0:Math.sin(row*.9+route)*22;
  holds.push({x:160+col*80+offset,y:100+row*70,color:colors[route]});
 }
 contacts=[44,45,56,57];selected=0;body={x:360,y:660};px=tx=body.x;py=ty=body.y;goal=2;
}
// Find a supported torso position while all four limbs remain within reach.
// Hands stay above the hips, feet below them, and the torso stays over support.
function solvePose(next){
 const points=next.map(i=>holds[i]);
 const desired={x:points.reduce((n,p)=>n+p.x,0)/4,y:(points[0].y+points[1].y+130+points[2].y+points[3].y-130)/4};
 let best=null,score=Infinity;
 for(let y=body.y-130;y<=body.y+130;y+=5)for(let x=body.x-100;x<=body.x+100;x+=5){
  if(points[0].y>y+5||points[1].y>y+5||points[2].y<y+20||points[3].y<y+20)continue;
  if(x<Math.min(points[2].x,points[3].x)-35||x>Math.max(points[2].x,points[3].x)+35)continue;
  if(!points.every((p,k)=>Math.hypot(p.x-(x+(k%2?18:-18)),p.y-(y+(k<2?-20:20)))<=(k<2?125:115)))continue;
  const value=(x-desired.x)**2+(y-desired.y)**2+.05*((x-body.x)**2+(y-body.y)**2);
  if(value<score){score=value;best={x,y}}
 }
 return best;
}
function tryLimb(i,commit=true){
 if(finished||i<0||contacts.includes(i))return false;
 const next=[...contacts];next[selected]=i;const pose=solvePose(next);
 if(!pose)return false;if(!commit)return pose;
 contacts=next;body=pose;tx=pose.x;ty=pose.y;moves++;hintNode=-1;hintUntil=0;
 finished=holds[contacts[0]].y===100&&holds[contacts[1]].y===100;update();
 if(finished)celebrate();else $('msg').textContent='Nice '+limbNames[selected].toLowerCase()+' move! Move your feet up to reach higher.';
 return true;
}
function selectLimb(k){selected=k;hintNode=-1;hintUntil=0;document.querySelectorAll('[data-limb]').forEach((b,i)=>b.setAttribute('aria-pressed',i===k));$('msg').textContent=limbNames[k]+': choose a hold you can reach while staying balanced.'}
function limbHint(){
 let candidate=-1,best=body.y;
 holds.forEach((h,i)=>{const pose=tryLimb(i,false);if(pose&&pose.y<best){best=pose.y;candidate=i}});
 hintNode=candidate;hintUntil=performance.now()+2500;
 $('msg').textContent=candidate>=0?'Try the ringed hold with your '+limbNames[selected].toLowerCase()+'.':'Try a different hand or foot. Raise your feet before stretching higher!';
}
function celebrate(){winTimer=setTimeout(()=>{$('result').textContent=levels[difficulty].name+' conquered in '+moves+' moves and '+attempts+' retries!';$('overlay').classList.add('show')},700)}
function reset(){finished=false;hintNode=-1;clearTimeout(winTimer);hintUntil=0;attempts=0;step=0;moves=0;holds=[];px=tx=360;py=ty=740;for(let i=0;i<levels[difficulty].count;i++){let x=360+Math.sin(i*1.75+route*1.4)*levels[difficulty].sway;holds.push({x,y:705-i*(583/(levels[difficulty].count-1)),color:colors[route],i});} if(difficulty===2)makeClimb();$('limbControls').hidden=difficulty!==2;if(difficulty===2)selectLimb(0);$('overlay').classList.remove('show');$('helpText').textContent=difficulty===2?'Choose a hand or foot, then tap a hold. Keep three other points planted. Your feet must support your body before you stretch higher. Get BOTH hands onto the top row!':'Climb the holds in your route’s color, from bottom to top. Easy shows the next hold. Tap ✦ for a hint.';$('keys').textContent=difficulty===2?'⌨️ Keys 1–4 choose a limb. Tab to a hand/foot button, then arrow keys move it.':'⌨️ You can also use ↑ or Space.';update();}
function update(){
 const progress=difficulty===2?(660-body.y)/500:step/levels[difficulty].count;
 $('height').textContent=(Math.max(0,progress)*18).toFixed(1)+' m';$('progress').style.width=Math.max(0,progress)*100+'%';
 $('moves').textContent=moves+' moves · '+attempts+' retries';
 $('msg').textContent=difficulty===2?(finished?'You did it!':limbNames[selected]+': choose a reachable hold.'):step===0?'Follow the '+names[route]+' holds.':step===levels[difficulty].count?'You did it!':difficulty===0?'Great move! Reach for the next glow.':'Great move! Find the next '+names[route]+' hold.';
}
function move(i){if(difficulty===2)return tryLimb(i);if(i!==step||step>=levels[difficulty].count)return;tx=holds[i].x;ty=holds[i].y+35;step++;moves++;update();if(step===levels[difficulty].count)winTimer=setTimeout(()=>{$('result').textContent=levels[difficulty].name+' conquered! 18 meters in '+moves+' moves and '+attempts+' retries.';$('overlay').classList.add('show')},700)}
c.addEventListener('pointerdown',e=>{
 const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*720/r.width,y=(e.clientY-r.top)*820/r.height;
 if(difficulty===2){if(finished)return;const i=holds.findIndex(h=>Math.hypot(h.x-x,h.y-y)<30);if(i>=0&&tryLimb(i))return;attempts++;update();$('msg').textContent='Too far or off balance! Move your feet up, or try another limb.';return}
 const h=holds[step];if(h&&Math.hypot(h.x-x,h.y-y)<levels[difficulty].hit)move(step);else if(h){attempts++;update();$('msg').textContent='Try the next '+names[route]+' hold above you!';if(difficulty===0)hintUntil=performance.now()+1500}
});
document.addEventListener('keydown',e=>{
 if(document.activeElement.tagName==='SELECT')return;
 if(difficulty===2){
  if(/^Digit[1-4]$/.test(e.code)){e.preventDefault();selectLimb(+e.code.slice(-1)-1);return}
  const delta={ArrowUp:-6,ArrowDown:6,ArrowLeft:-1,ArrowRight:1}[e.code];
  if(delta){e.preventDefault();const from=contacts[selected],to=from+delta;
   if(to>=0&&to<holds.length&&(Math.abs(delta)===6||Math.floor(from/6)===Math.floor(to/6)))tryLimb(to)}return;
 }
 if(document.activeElement.tagName==='BUTTON')return;
 if(e.code==='ArrowUp'||e.code==='Space'){e.preventDefault();move(step)}
});
$('restart').onclick=reset;$('difficulty').onchange=e=>{difficulty=+e.target.value;$('levelInfo').textContent=levels[difficulty].info;reset()};$('route').onchange=e=>{route=+e.target.value;reset()};$('hint').onclick=()=>{if(difficulty===2){if(finished)return;limbHint();return}hintUntil=performance.now()+2500;$('msg').textContent='Tap the hold with the sparkling ring!'};$('next').onclick=()=>{route=(route+1)%3;$('route').value=route;reset()};
function line(x,y,x2,y2,color,w){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function hold(x,y,color,size=20){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(x+y)*.5);ctx.fillStyle='#0002';ctx.beginPath();ctx.ellipse(2,5,size+2,size*.68,0,0,7);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-size,4);ctx.quadraticCurveTo(-size-5,-size*.8,-4,-size*.65);ctx.quadraticCurveTo(size,-size,size,1);ctx.quadraticCurveTo(size*.7,size*.7,-size,4);ctx.fill();ctx.fillStyle='#fff5';ctx.beginPath();ctx.ellipse(-4,-5,7,3,-.2,0,7);ctx.fill();ctx.fillStyle='#0004';ctx.beginPath();ctx.arc(2,1,2.4,0,7);ctx.fill();ctx.restore()}
function draw(t){ctx.clearRect(0,0,720,820);ctx.fillStyle='#ddd3c6';ctx.fillRect(0,0,720,820);ctx.fillStyle='#cbbfae';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(240,0);ctx.lineTo(140,820);ctx.lineTo(0,820);ctx.fill();ctx.fillStyle='#e9e0d3';ctx.beginPath();ctx.moveTo(550,0);ctx.lineTo(720,0);ctx.lineTo(720,820);ctx.lineTo(620,820);ctx.lineTo(490,400);ctx.fill();for(let x=35;x<720;x+=65)for(let y=40;y<780;y+=65){ctx.fillStyle='#a79d8c66';ctx.beginPath();ctx.arc(x,y,2,0,7);ctx.fill()}ctx.fillStyle='#b5c5ac';ctx.fillRect(0,785,720,35);ctx.fillStyle='#637b62';ctx.font='bold 14px system-ui';ctx.textAlign='left';ctx.fillText('THE LITTLE SUMMIT CLIMBING CLUB',24,808);
for(let i=0;i<(difficulty===2?0:23);i++){let x=45+(i*173)%630,y=90+(i*97)%635;if(!holds.some(h=>Math.hypot(h.x-x,h.y-y)<55))hold(x,y,['#e1ad69','#7f9b83','#bd7d73'][i%3],16)}
holds.forEach((h,i)=>{if(difficulty===2?(i===hintNode&&t<hintUntil):(i===step&&(difficulty===0||t<hintUntil))){ctx.strokeStyle=t<hintUntil?'#fffbd0':'#ffffffaa';ctx.lineWidth=t<hintUntil?5:3;ctx.beginPath();ctx.arc(h.x,h.y,30+Math.sin(t/240)*4,0,7);ctx.stroke()}hold(h.x,h.y,(difficulty===2?contacts.includes(i):i<step)?'#6f8d76':h.color,levels[difficulty].size);if(difficulty!==2&&i<step){ctx.fillStyle='white';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('✓',h.x,h.y+5)}});let top=difficulty===2?{x:360,y:100}:holds[holds.length-1];line(top.x+30,top.y+3,top.x+30,top.y-48,'#53675b',4);ctx.fillStyle='#f9edba';ctx.beginPath();ctx.moveTo(top.x+30,top.y-48);ctx.lineTo(top.x+70,top.y-36);ctx.lineTo(top.x+30,top.y-23);ctx.fill();
px+=(tx-px)*.12;py+=(ty-py)*.12;if(difficulty===2){drawPose();requestAnimationFrame(draw);return}let x=px,y=py;line(360,0,x,y+25,'#f2bd69',3);line(x,y+18,x-21,y+47,'#374d58',12);line(x,y+18,x+23,y+45,'#374d58',12);line(x-21,y+47,x-32,y+46,'#353634',11);line(x+23,y+45,x+34,y+44,'#353634',11);line(x,y-8,x-24,y-21,'#f1b587',11);line(x-24,y-21,x-20,y-40,'#f1b587',9);line(x+1,y-8,x+22,y-26,'#f1b587',11);line(x+22,y-26,x+5,y-35,'#f1b587',9);line(x,y-13,x,y+18,'#e98c66',26);line(x-12,y+13,x+12,y+13,'#3b6867',5);ctx.fillStyle='#f1b587';ctx.beginPath();ctx.arc(x,y-34,15,0,7);ctx.fill();ctx.fillStyle='#365549';ctx.beginPath();ctx.arc(x,y-40,17,Math.PI,Math.PI*2);ctx.fill();line(x-17,y-40,x+17,y-40,'#365549',5);ctx.fillStyle='#fff7';ctx.beginPath();ctx.ellipse(x-5,y-48,6,2,-.3,0,7);ctx.fill();requestAnimationFrame(draw)}function drawPose(){
 const x=px,y=py;
 line(360,0,x,y+15,'#f2bd69',3);
 contacts.forEach((n,k)=>{
  const p=holds[n],sx=x+(k%2?18:-18),sy=y+(k<2?-20:20);
  const mx=(sx+p.x)/2+(k%2?12:-12),my=(sy+p.y)/2+(k<2?12:-8);
  line(sx,sy,mx,my,k<2?'#f1b587':'#374d58',11);line(mx,my,p.x,p.y,k<2?'#f1b587':'#374d58',10);
  ctx.fillStyle=k===selected?'#ffe39a':'#fff';ctx.beginPath();ctx.arc(p.x,p.y,15,0,7);ctx.fill();ctx.fillStyle='#293e38';ctx.textAlign='center';ctx.font='bold 11px system-ui';ctx.fillText(limbLabels[k],p.x,p.y+4);
  if(k===selected){ctx.strokeStyle='#d18b36';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,22,0,7);ctx.stroke()}
 });
 line(x,y-20,x,y+20,'#e98c66',29);line(x-15,y+15,x+15,y+15,'#3b6867',5);
 ctx.fillStyle='#f1b587';ctx.beginPath();ctx.arc(x,y-45,15,0,7);ctx.fill();ctx.fillStyle='#365549';ctx.beginPath();ctx.arc(x,y-50,17,Math.PI,Math.PI*2);ctx.fill();line(x-17,y-50,x+17,y-50,'#365549',5);
}
document.querySelectorAll('[data-limb]').forEach((b,k)=>b.onclick=()=>selectLimb(k));
reset();requestAnimationFrame(draw);
