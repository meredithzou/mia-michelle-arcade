#!/usr/bin/env node
"use strict";

// Browser-independent interaction checks for the cooking game's state machine.
// In particular, advancing after serving must work on the FIRST tap.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Element {
  constructor() {
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.classList = { toggle() {} };
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.innerHTML = "";
    this.textContent = "";
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(element) { this.children.push(element); }
  replaceChildren() { this.children = []; }
  focus() {}
  remove() {}
  click() {
    assert.equal(this.disabled, false, "clicked a disabled control");
    const handler = this.listeners.click || this.onclick;
    assert.equal(typeof handler, "function", "clicked a button with no handler");
    handler();
  }
}

const elements = new Map();
const document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  },
  createElement() { return new Element(); }
};
const $ = (id) => document.getElementById(id);
const code = fs.readFileSync(path.join(__dirname, "../games/little-chef-kitchen/game.js"), "utf8");
vm.runInNewContext(code, {
  document,
  localStorage: { getItem() { return null; }, setItem() {} },
  setTimeout() {},
  Math,
  console
}, { filename: "little-chef-kitchen/game.js" });

function chooseCategory(label) {
  const button = $("menu").children.find((node) => node.innerHTML.includes(`>${label}</span>`));
  assert.ok(button, `missing menu category: ${label}`);
  button.click();
}

function cookAndServe() {
  const recipe = $("recipe").innerHTML;
  const available = $("ingredients").children.slice();
  let chosen = 0;
  for (const button of available) {
    const match = button.innerHTML.match(/<span class="label">([^<]+)<\/span>/);
    assert.ok(match, "ingredient needs a label");
    if (recipe.includes(` ${match[1]}`)) { button.click(); chosen++; }
  }
  assert.ok(chosen >= 3 && chosen <= 4, "recipe ingredients should be selectable");
  assert.equal($("action").disabled, false, "correct recipe should enable Prepare Food");
  $("action").click(); // Prepare food.
  for (let i = 0; i < 3; i++) $("action").click(); // Stir, flip, bake, etc.
  assert.match($("action").textContent, /Serve Food/);
  $("action").click(); // Serve.
  assert.equal($("result-overlay").hidden, false, "serving should show a result");
}

// Repeated dish types must offer different recipes.
chooseCategory("Soup");
const soup1 = $("food-title").textContent;
chooseCategory("Soup");
assert.notEqual($("food-title").textContent, soup1, "repeated soup should vary");

// Tomato and ketchup must have visually distinct ingredient icons.
chooseCategory("Hot Dog");
const ketchup = $("ingredients").children.find((node) => node.innerHTML.includes(">Ketchup</span>"));
assert.ok(ketchup, "ketchup should be in the hot dog pantry");
assert.match(ketchup.innerHTML, /ketchup-bottle/, "ketchup should use its red bottle icon");
assert.doesNotMatch(ketchup.innerHTML, /🍅/, "ketchup must not use the tomato icon");

for (let customer = 1; customer <= 8; customer++) {
  cookAndServe();
  $("next").click();
  if (customer < 8) {
    assert.equal($("result-overlay").hidden, true, "one tap should dismiss the result");
    assert.match($("round").textContent, new RegExp(`Customer ${customer + 1} / 8`), "one tap should advance the customer");
    assert.equal($("action").disabled, true, "new order should start with an empty plate");
  }
}

assert.match($("result-title").textContent, /CHEF/, "last customer should lead to the chef award");
$("next").click();
assert.match($("round").textContent, /Customer 1 \/ 8/, "Play Again should reset the game");
assert.equal($("result-overlay").hidden, true, "Play Again should dismiss the award");
console.log("Little Chef Kitchen tests passed: varied recipes, ketchup bottle, 8 one-tap customers, replay");
