const assert = require('node:assert/strict');
const P = require('../games/marble-run-lab/physics.js');
function run(pieces) {
  const ball = {x:150, y:75, vx:0, vy:0, age:0};
  for (let i=0; i<28*240; i++) {
    P.step(ball, pieces, 1/240);
    assert([ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite));
    if (ball.y>632 && ball.y<683 && Math.abs(ball.x-840)<32) return true;
    if (ball.y>740 || ball.x< -40 || ball.x>1040) return false;
  }
  return false;
}
assert(run(P.example()), 'The example track must reach its finish');
assert(!run([]), 'An empty track must not reach the distant finish');
assert(!run(P.example().filter(p=>p.type!=='wall')), 'The marble must fall off when the turn walls are removed');
const ball={x:50,y:30,vx:0,vy:0,age:0};
P.step(ball, [], .1);
assert(ball.y>30 && ball.vy>0, 'A released marble accelerates downward');
console.log('Marble Run passed: example finish, missing-track and missing-wall failures, gravity, finite simulation.');
