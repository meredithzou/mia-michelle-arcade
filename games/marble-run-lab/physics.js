(function(root){
const R=11,G=480;
function points(p){let raw=p.type==='curve'?[[-110,-30],[-65,7],[0,30],[65,7],[110,-30]]:p.type==='wall'?[[0,-70],[0,70]]:[[-110,-23],[110,23]];const t=p.angle*Math.PI/180;return raw.map(([x,y])=>({x:p.x+x*Math.cos(t)-y*Math.sin(t),y:p.y+x*Math.sin(t)+y*Math.cos(t)}))}
function step(b,pieces,dt){b.vy+=G*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;for(const p of pieces){const a=points(p);for(let i=1;i<a.length;i++){const u=a[i-1],v=a[i],dx=v.x-u.x,dy=v.y-u.y,l2=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((b.x-u.x)*dx+(b.y-u.y)*dy)/l2)),qx=u.x+t*dx,qy=u.y+t*dy;let nx=b.x-qx,ny=b.y-qy,d=Math.hypot(nx,ny);if(d<R+6&&d>.00001){nx/=d;ny/=d;b.x=qx+nx*(R+6);b.y=qy+ny*(R+6);const vn=b.vx*nx+b.vy*ny;if(vn<0){const e=p.type==='bounce'?.85:.08;b.vx-=(1+e)*vn*nx;b.vy-=(1+e)*vn*ny;b.vx*=.9998;b.vy*=.9998}}}}b.age+=dt;return b}
function example(){return [
{x:240,y:175,type:'ramp',angle:0},{x:450,y:219,type:'ramp',angle:0},{x:660,y:263,type:'ramp',angle:0},
{x:830,y:290,type:'wall',angle:0},
{x:720,y:370,type:'ramp',angle:-24},{x:510,y:415,type:'ramp',angle:-24},{x:300,y:460,type:'ramp',angle:-24},
{x:150,y:475,type:'wall',angle:0},
{x:250,y:550,type:'ramp',angle:0},{x:460,y:594,type:'ramp',angle:0},{x:670,y:638,type:'ramp',angle:0}]}
const api={points,step,example,R};if(typeof module!=='undefined')module.exports=api;else root.MarblePhysics=api;
})(this);
