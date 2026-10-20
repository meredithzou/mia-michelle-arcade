#!/usr/bin/env node
"use strict";
// Run with: node scripts/test_settings.cjs
// No npm dependencies; tests storage and actual game-owned schemas from HTML.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const shared = read("shared/settings.js");
const noteHTML = read("games/name-the-note/index.html");
const note = noteHTML + "\n" + read("games/name-the-note/game.js");
const checkers = read("games/chinese-checkers/index.html");

function fixture(initial = {}, flags = {}) {
  const items = new Map(Object.entries(initial));
  const storage = {
    getItem(key) {
      if (flags.failRead) throw Error("storage unavailable");
      return items.has(key) ? items.get(key) : null;
    },
    setItem(key, value) {
      if (flags.failWrite) throw Error("quota exceeded");
      items.set(key, String(value));
    }
  };
  const window = { localStorage: storage };
  vm.runInNewContext(shared, { window }, { filename: "shared/settings.js" });
  return { api: window.ArcadeSettings, items, storage };
}

function schemaFromHTML(html, beginning, ending) {
  const start = html.indexOf(beginning);
  const end = html.indexOf(ending, start);
  assert.ok(start !== -1 && end > start, "schema must exist in game HTML");
  let schema;
  const window = {
    ArcadeSettings: {
      create(opts) { schema = opts; return { load() { return opts.defaults; } }; }
    }
  };
  vm.runInNewContext(html.slice(start, end), { window });
  assert.ok(schema, "game must register a schema");
  return schema;
}

function equal(actual, expected) {
  // Convert VM-native prototypes to local prototypes for meaningful assertions.
  assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected);
}

function test(title, action) {
  action();
  console.log("✓ " + title);
}

const noteSchema = schemaFromHTML(note, "const init={mode:", "let cfg=practiceSettings.load()");
const ccSchema = schemaFromHTML(checkers, "const ccStorage=window.ArcadeSettings.create({", "const ccPrefs=ccStorage.load()");
const defaultNote = {
  mode: "treble", trebleMin: 28, trebleMax: 40,
  bassMin: 16, bassMax: 28, values: ["quarter"], sound: true
};
const defaultCC = { language: "zh", sound: true, hints: true, playerCount: 2, jumpRule: "long" };

test("Default settings are isolated per game", () => {
  const f = fixture();
  equal(f.api.create(noteSchema).load(), defaultNote);
  equal(f.api.create(ccSchema).load(), defaultCC);
  assert.notEqual(noteSchema.key, ccSchema.key);
});

test("Name the Note: save and restore every setting including sound", () => {
  const f = fixture();
  const settings = f.api.create(noteSchema);
  const chosen = {
    mode: "grand", trebleMin: 21, trebleMax: 46,
    bassMin: 10, bassMax: 35, values: ["whole", "half"], sound: false
  };
  assert.equal(settings.save(chosen), true);
  equal(f.api.create(noteSchema).load(), { ...chosen, values: ["half", "whole"] });
  assert.equal(JSON.parse(f.items.get(noteSchema.key)).version, 1);
});

test("Name the Note: unsupported, missing or inconsistent fields recover safely", () => {
  const f = fixture();
  const settings = f.api.create(noteSchema);
  assert.equal(settings.save({
    mode: "wrong", trebleMin: 46, trebleMax: 21,
    bassMin: 11, bassMax: 32, values: ["weird", "whole", "whole"], sound: "off",
    removedField: 10
  }), true);
  equal(settings.load(), {
    ...defaultNote, bassMin: 11, bassMax: 32, values: ["whole"]
  });
  settings.save({ mode: "bass" });
  equal(settings.load(), { ...defaultNote, mode: "bass" });
});

test("Corrupt records and incompatible versions return safe defaults", () => {
  for (const record of ["{broken", "null", "[]", JSON.stringify({ version: 999, settings: { mode: "grand" } })]) {
    const f = fixture({ [noteSchema.key]: record });
    equal(f.api.create(noteSchema).load(), defaultNote);
  }
});

test("New game schema versions can explicitly migrate existing records", () => {
  const f = fixture({ "test.versioned": JSON.stringify({ version: 1, settings: { oldMode: "grand" } }) });
  let migrations = 0;
  const s = f.api.create({
    key: "test.versioned", version: 2, defaults: { mode: "treble" },
    normalize: (value, defaults) => ({ mode: ["grand", "treble"].includes(value.mode) ? value.mode : defaults.mode }),
    upgrade: (version, value) => {
      migrations++;
      return version === 1 ? { mode: value.oldMode } : null;
    }
  });
  equal(s.load(), { mode: "grand" });
  assert.equal(migrations, 1);
  assert.equal(JSON.parse(f.items.get("test.versioned")).version, 2);
});

test("Blocked, broken or full localStorage never crashes a game", () => {
  const deniedRead = fixture({}, { failRead: true });
  equal(deniedRead.api.create(noteSchema).load(), defaultNote);
  const deniedWrite = fixture({}, { failWrite: true });
  const settings = deniedWrite.api.create(noteSchema);
  assert.equal(settings.save({ mode: "bass" }), false);
  equal(settings.load(), defaultNote);
  const noStorage = { localStorage: null };
  vm.runInNewContext(shared, { window: noStorage });
  equal(noStorage.ArcadeSettings.create(noteSchema).load(), defaultNote);
});

test("Loaded arrays and defaults are independent copies", () => {
  const f = fixture();
  const settings = f.api.create(noteSchema);
  const a = settings.load();
  a.values.push("whole");
  equal(settings.load(), defaultNote);
});

test("Chinese Checkers: migrate all five v1.7 preferences, preserving legacy keys", () => {
  const legacy = {
    "cc-v17-language": "en", "cc-v17-sound": "off",
    "cc-v17-hints": "off", "cc-v17-player-count": "4",
    "cc-v17-jump-rule": "short", "cj-dash-best": "124"
  };
  const f = fixture(legacy);
  const settings = f.api.create(ccSchema);
  equal(settings.load(), { language: "en", sound: false, hints: false, playerCount: 4, jumpRule: "short" });
  for (const [key, value] of Object.entries(legacy)) assert.equal(f.items.get(key), value);
  assert.equal(JSON.parse(f.items.get(ccSchema.key)).version, 1);
  f.items.set("cc-v17-language", "es");
  equal(settings.load(), { language: "en", sound: false, hints: false, playerCount: 4, jumpRule: "short" });
});

test("Chinese Checkers: partial and invalid legacy values safely default", () => {
  const f = fixture({ "cc-v17-language": "bad", "cc-v17-player-count": "9",
                       "cc-v17-jump-rule": "bad", "cc-v17-sound": "off" });
  equal(f.api.create(ccSchema).load(), { ...defaultCC, sound: false });
});

test("Chinese Checkers: saved new preferences win over older legacy values", () => {
  const f = fixture({ "cc-v17-language": "es" });
  const settings = f.api.create(ccSchema);
  settings.save({ ...defaultCC, language: "zh", jumpRule: "short" });
  equal(settings.load(), { ...defaultCC, jumpRule: "short" });
});

test("Integration: scripts load before game code; apply, mute, and preference actions persist", () => {
  assert.ok(noteHTML.indexOf('src="../../shared/settings.js"') < noteHTML.indexOf('src="game.js"'));
  assert.ok(checkers.indexOf('src="../../shared/settings.js"') < checkers.indexOf("(function(){"));
  assert.ok(note.includes("let cfg=practiceSettings.load()"));
  assert.ok(note.includes("practiceSettings.save(cfg)"));
  assert.ok(checkers.includes("const ccPrefs=ccStorage.load()"));
  assert.ok(checkers.includes("const savePref=()=>ccStorage.save("));
  assert.equal((checkers.match(/savePref\(\)/g) || []).length, 5);
  assert.ok(read("games/chicken-jockey-dash/index.html").includes("cj-dash-best"));
  assert.ok(!read("games/chicken-jockey-dash/index.html").includes('src="../../shared/settings.js"'));
});

console.log("Settings tests passed");
