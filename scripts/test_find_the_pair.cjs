#!/usr/bin/env node
/** Find the Pair! smoke tests: exact-one-match math and tap-driven game flow.
 * Runs with Node built-ins; does not need a browser or external packages.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../games/find-the-pair/index.html'), 'utf8');

// The pink hover highlight must only apply to true mouse-like pointing devices.
// Touch Safari can keep :hover active after a tap; do not leave an unguarded rule.
const guardedHover = /@media\s*\(\s*hover\s*:\s*hover\s*\)\s*and\s*\(\s*pointer\s*:\s*fine\s*\)\s*\{\s*(\.symbol:hover\s*\{[^}]*\})\s*\}/.exec(source);
assert.ok(guardedHover, 'Picture hover highlight must be gated behind mouse-only media conditions');
assert.doesNotMatch(source.replace(guardedHover[0], ''), /\.symbol:hover\s*\{/,
  'No unguarded picture hover highlight on touch devices');

const script = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(code => code.includes('const deck = []'));
assert.ok(script, 'The playable game script should exist');

// Verify every possible pair of distinct cards, not just randomly sampled rounds.
const section = script.match(/const deck = \[\];([\s\S]*?)const locations =/);
assert.ok(section, 'Find mathematical deck construction');
const deck = vm.runInNewContext(`(()=>{const deck=[];${section[1]}return deck;})()`);
assert.equal(deck.length, 31);
for (let i = 0; i < deck.length; i++) {
  assert.equal(deck[i].length, 6);
  assert.equal(new Set(deck[i]).size, 6);
  for (let j = i + 1; j < deck.length; j++)
    assert.equal(deck[i].filter(x => deck[j].includes(x)).length, 1, `Cards ${i} and ${j}`);
}

// Minimal DOM stand-ins exercise actual game handlers (tap, hint, reset, win).
// The test does not claim to check real iPad layout or touch behavior.
class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.style = {setProperty() {}};
    this.className = '';
    this.textContent = '';
    this._classes = new Set();
    this.classList = {
      add: name => this._classes.add(name),
      remove: name => this._classes.delete(name),
      contains: name => this._classes.has(name),
      toggle: (name, force) => {
        const active = force === undefined ? !this._classes.has(name) : force;
        if (active) this._classes.add(name); else this._classes.delete(name);
        return active;
      },
    };
  }
  set innerHTML(value) { if (value === '') this.children = []; }
  setAttribute(name, value) { (this.attrs??={})[name] = value; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
  appendChild(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  querySelectorAll(selector) {
    assert.equal(selector, '.symbol');
    return this.children.filter(child => child.className === 'symbol');
  }
  click() { assert.ok(this.listeners.click); this.listeners.click(); }
  get offsetWidth() { return 100; }
}
const ids = ['game','card1','card2','score','progress','message','hint','reset','again','win',
  'level-easy','level-medium','level-hard'];
const dom = Object.fromEntries(ids.map(id => [id, new Element()]));
const timers = new Map();
let nextTimer = 0;
vm.runInNewContext(script, {
  document: {
    getElementById: id => {assert.ok(dom[id], `Missing DOM: ${id}`); return dom[id];},
    createElement: () => new Element(),
  },
  setTimeout: callback => {const id = ++nextTimer; timers.set(id, callback); return id;},
  clearTimeout: id => timers.delete(id),
  Math,
});
const symbols = card => dom[card].querySelectorAll('.symbol');
function match(count) {
  const a = symbols('card1'), b = symbols('card2');
  assert.equal(a.length, count, 'Card 1 picture count');
  assert.equal(b.length, count, 'Card 2 picture count');
  assert.equal(new Set(a.map(x=>x.dataset.picture)).size, count);
  assert.equal(new Set(b.map(x=>x.dataset.picture)).size, count);
  const common = a.filter(button => b.some(other => other.dataset.picture === button.dataset.picture));
  assert.equal(common.length, 1, 'Displayed cards must share exactly one picture');
  return common[0];
}
function checkMode(name,count) {
  assert.equal(dom.game.dataset.level, name);
  for(const level of ['easy','medium','hard']) {
    assert.equal(dom['level-'+level].classList.contains('active'), level===name);
    assert.equal(dom['level-'+level].attrs['aria-pressed'], String(level===name));
  }
  return match(count);
}
function completeRound() {
  assert.equal(timers.size, 1, 'Exactly one round timer');
  const [id, callback] = timers.entries().next().value;
  timers.delete(id);
  callback();
}
// Easy is the initial mode: two large symbols per card for the youngest players.
const first = checkMode('easy',2);
symbols('card1').find(button => button.dataset.picture !== first.dataset.picture).click();
assert.equal(dom.score.textContent, 0, 'Wrong answer does not score');
dom.hint.click();
assert.equal([...symbols('card1'), ...symbols('card2')]
  .filter(button => button.classList.contains('hint')).length, 2, 'Hint highlights the match on both cards');
match(2).click();
assert.equal(dom.score.textContent, 1);
assert.equal(timers.size, 1);
// Changing difficulty mid-animation cancels the old timer and starts afresh.
dom['level-medium'].click();
assert.equal(timers.size, 0);
assert.equal(dom.score.textContent, 0);
checkMode('medium',4);
for (let i=0; i<3; i++) {
  match(4).click();
  assert.equal(dom.score.textContent, i+1);
  completeRound();
}
// Switching to Hard must reset the progress and keep the old six-picture game.
dom['level-hard'].click();
assert.equal(dom.score.textContent, 0);
checkMode('hard',6);
for (let score=1; score<=10; score++) {
  match(6).click();
  assert.equal(dom.score.textContent, score);
  completeRound();
}
assert.ok(dom.win.classList.contains('show'), 'Victory after 10 matches');
dom.again.click();
assert.equal(dom.score.textContent, 0);
assert.ok(!dom.win.classList.contains('show'));
checkMode('hard',6);
dom['level-easy'].click();
checkMode('easy',2);
for (let i=1; i<=10; i++) {
  match(2).click();
  assert.equal(dom.score.textContent, i);
  completeRound();
}
assert.ok(dom.win.classList.contains('show'), 'Victory also works in Easy');
dom.reset.click();
assert.equal(dom.score.textContent, 0);
assert.ok(!dom.win.classList.contains('show'));
checkMode('easy',2);
assert.match(source, /Amazing! You did it!/);
assert.doesNotMatch(source, /Good job, Mia|You're amazing, Mia!/i);
console.log('Find the Pair! passed: 465 card pairs, 2/4/6 modes, switch/reset, hint, scoring, wins.');
