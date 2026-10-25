const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('games/chinese-chess/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = new Map();
const stub = () => ({setAttribute(){},appendChild(){},append(){},replaceChildren(){},addEventListener(name, fn){this[name]=fn;},cloneNode(){return stub();}});
const context = {assert,confirm:()=>true,document:{getElementById(id){if(!elements.has(id))elements.set(id,stub());return elements.get(id);},createElementNS:stub}};
vm.createContext(context);vm.runInContext(source,context);
vm.runInContext(`
assert.equal(b.flat().filter(Boolean).length,32);
assert.equal(moves(0,9).length,2);
assert.equal(legal(1,9,2,7),true);
b[8][1]={s:'r',t:'p'}; assert.equal(legal(1,9,2,7),false);
initial(); assert.equal(legal(2,9,4,7),true);
b[8][3]={s:'r',t:'p'};assert.equal(legal(2,9,4,7),false);
initial();assert.equal(legal(0,6,1,6),false);assert.equal(legal(0,6,0,5),true);assert.equal(legal(0,6,0,7),false);
function empty(){b=Array.from({length:10},()=>Array(9).fill(null));b[0][4]={s:'b',t:'k'};b[9][4]={s:'r',t:'k'};b[5][4]={s:'r',t:'r'};}
empty();assert.equal(legal(4,5,3,5),false);assert.equal(check('r'),false);
b[5][4]=null;assert.equal(check('r'),true);assert.equal(check('b'),true);
empty();b[5][0]={s:'r',t:'c'};b[0][0]={s:'b',t:'r'};assert.equal(raw(0,5,0,0),false);b[3][0]={s:'b',t:'p'};assert.equal(raw(0,5,0,0),true);b[2][0]={s:'b',t:'p'};assert.equal(raw(0,5,0,0),false);assert.equal(raw(0,5,0,4),true);
empty();b[5][2]={s:'r',t:'e'};assert.equal(raw(2,5,4,3),false);
b[4][0]={s:'r',t:'p'};assert.equal(raw(0,4,1,4),true);assert.equal(raw(0,4,0,5),false);
b[9][3]={s:'r',t:'a'};assert.equal(raw(3,9,4,8),true);assert.equal(raw(3,9,2,8),false);assert.equal(raw(4,9,5,9),true);
// Red is stalemated: both side squares and the only forward square are covered.
empty();b[5][4]={s:'b',t:'p'};b[1][3]={s:'b',t:'r'};b[1][5]={s:'b',t:'r'};b[8][0]={s:'b',t:'r'};
assert.equal(check('r'),false);assert.equal(hasMoves('r'),false);
initial();assert.equal(hasMoves('r'),true);assert.equal(hasMoves('b'),true);
// Undo restores position, turn, previous highlights, and clears game-over state.
history.push({b:JSON.stringify(b),turn,last});b[5][0]=b[6][0];b[6][0]=null;turn='b';over=true;
document.getElementById('undo').onclick();assert.equal(turn,'r');assert.equal(b[6][0].t,'p');assert.equal(b[5][0],null);assert.equal(over,false);assert.equal(history.length,0);
`, context);
console.log('Chinese Chess: movement, blocking, river/palace limits, cannon screens, flying generals, stalemate, and undo passed.');
