#!/usr/bin/env node
/**
 * Settings persistence regression tests (run: node scripts/test_settings.cjs).
 * Loads the real shared/settings.js and game-defined schemas into an isolated VM.
 * Checks save/restore, validation, version migration, legacy preferences,
 * and graceful fallback when localStorage is missing, corrupt, or full.
 * No browser, network, or npm dependencies are needed.
 */
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
const noteHTML = read("games/name-that-note/index.html");
const note = noteHTML + "\n" + read("games/name-that-note/game.js");
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
  const schemaContext={window};vm.createContext(schemaContext);
  vm.runInContext(read('shared/music/piano-input.js'),schemaContext);
  vm.runInContext(html.slice(start, end),schemaContext);
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
const playSchema = schemaFromHTML(read("games/play-that-note/game.js"), "const init={mode:", "let cfg=practiceSettings.load()");
const ccSchema = schemaFromHTML(checkers, "const ccStorage=window.ArcadeSettings.create({", "const ccPrefs=ccStorage.load()");
const defaultNote = {
  mode: "treble", trebleMin: 28, trebleMax: 40,
  bassMin: 16, bassMax: 28, values: ["quarter"], sound: true
};
const defaultCC = { language: "zh", sound: true, hints: true, playerCount: 2, jumpRule: "long" };
const finderSchema=schemaFromHTML(read("games/piano-note-finder/game.js"),"const preferences=","const saved=");
test("Piano Note Finder: validated sensitivity, persistence, and independent storage",()=>{
 const f=fixture(),store=f.api.create(finderSchema);
 equal(store.load(),{sensitivity:"standard"});
 for(const sensitivity of ["low","standard","high"]){store.save({sensitivity});equal(f.api.create(finderSchema).load(),{sensitivity});}
 store.save({sensitivity:"unknown"});equal(store.load(),{sensitivity:"standard"});
 assert.notEqual(finderSchema.key,noteSchema.key);assert.notEqual(finderSchema.key,playSchema.key);
 equal(fixture({}, {failRead:true,failWrite:true}).api.create(finderSchema).load(),{sensitivity:"standard"});
});

test("Default settings are isolated per game", () => {
  const f = fixture();
  equal(f.api.create(noteSchema).load(), defaultNote);
  equal(f.api.create(ccSchema).load(), defaultCC);
  assert.notEqual(noteSchema.key, ccSchema.key);
});

test("Name That Note!: save and restore every setting including sound", () => {
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

test("Name That Note!: unsupported, missing or inconsistent fields recover safely", () => {
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

const defaultPlay={...defaultNote,accidentals:"mixed",input:"touch",sensitivity:"standard"};
test("Play That Note: independent preferences, bounded ranges and accidental validation", () => {
  const f=fixture(), store=f.api.create(playSchema);
  equal(store.load(),defaultPlay);
  assert.notEqual(playSchema.key,noteSchema.key);
  store.save({mode:"bass",trebleMin:28,trebleMax:42,bassMin:14,bassMax:28,values:["half"],sound:false,accidentals:"flat"});
  equal(store.load(),{mode:"bass",trebleMin:28,trebleMax:42,bassMin:14,bassMax:28,values:["half"],sound:false,accidentals:"flat",input:"touch",sensitivity:"standard"});
  equal(f.api.create(noteSchema).load(),defaultNote);
  store.save({mode:"grand",trebleMin:21,trebleMax:46,bassMin:35,bassMax:10,values:[],accidentals:"double-sharp"});
  equal(store.load(),defaultPlay);
  for(const flags of [{failRead:true},{failWrite:true}])equal(fixture({},flags).api.create(playSchema).load(),defaultPlay);
});
test("Play That Note: microphone sensitivity validates and persists independently",()=>{
 const f=fixture(),s=f.api.create(playSchema);
 for(const sensitivity of ['low','standard','high']){
  s.save({...defaultPlay,input:'piano',sensitivity});
  equal(f.api.create(playSchema).load(),{...defaultPlay,input:'piano',sensitivity});
 }
 s.save({...defaultPlay,input:'invalid',sensitivity:'extreme'});equal(s.load(),defaultPlay);
 equal(f.api.create(noteSchema).load(),defaultNote);
});
test("Play That Note: migrate renamed preferences without losing the legacy record", () => {
  const legacyKey="arcade.settings.find-that-note";
  const chosen={...defaultNote,mode:"bass",sound:false,accidentals:"flat"};
  const raw=JSON.stringify({version:1,settings:chosen});
  const f=fixture({[legacyKey]:raw});
  const migrated={...chosen,input:'touch',sensitivity:'standard'};
  equal(f.api.create(playSchema).load(),migrated);
  equal(JSON.parse(f.items.get(playSchema.key)).settings,migrated);
  assert.equal(f.items.get(legacyKey),raw);
  const current={...migrated,sound:true};
  f.api.create(playSchema).save(current);
  equal(f.api.create(playSchema).load(),current);
  for(const value of ['broken',JSON.stringify({version:99,settings:chosen})]){
    equal(fixture({[legacyKey]:value}).api.create(playSchema).load(),defaultPlay);
  }
  equal(fixture({[legacyKey]:raw},{failWrite:true}).api.create(playSchema).load(),migrated);
});
console.log("Settings tests passed");


const pitchSchema=schemaFromHTML(read("games/do-i-have-absolute-pitch/game.js"),"const pianoInput=window.ArcadePianoInput;","let cfg=practiceSettings.load()");
test("Listening game: microphone sensitivity persists and invalid values use the shared default",()=>{
 const f=fixture(),s=f.api.create(pitchSchema);
 assert.equal(s.load().sensitivity,'standard');
 s.save({...s.load(),sensitivity:'high'});assert.equal(s.load().sensitivity,'high');
 s.save({...s.load(),sensitivity:'invalid'});assert.equal(s.load().sensitivity,'standard');
});
test("Listening game: selected-note preferences persist independently and validate each range",()=>{
 const f=fixture(),s=f.api.create(pitchSchema),defaults=JSON.parse(JSON.stringify(pitchSchema.defaults));
 equal(s.load(),defaults);
 const chosen={...defaults,range:"lower",hints:false,selectedByRange:{...defaults.selectedByRange,lower:[36,41,59]}};
 s.save(chosen);equal(f.api.create(pitchSchema).load(),chosen);
 equal(f.api.create(playSchema).load(),defaultPlay);
 s.save({...chosen,selectedByRange:{lower:[36,36,60,61,-1,"40",NaN],middle:[],upper:[72]}});
 equal(s.load().selectedByRange,{lower:[36,60],middle:[],upper:[72]});
 for(const flags of [{failRead:true},{failWrite:true}])equal(fixture({},flags).api.create(pitchSchema).load(),defaults);
});
test("Listening game: both earlier schemas migrate range, hints, and white-key choices",()=>{
 for(const version of [1,2]){
  const f=fixture({[pitchSchema.key]:JSON.stringify({version,settings:{range:"upper",notes:"white",sound:false,hints:false}})});
  const saved=f.api.create(pitchSchema).load();
  assert.equal(saved.range,"upper");assert.equal(saved.hints,version===1);
  equal(saved.selectedByRange.upper,[60,62,64,65,67,69,71,72,74,76,77,79,81,83,84]);
  assert.equal(JSON.parse(f.items.get(pitchSchema.key)).version,3);
 }
});

test("Listening game: stored empty active pool recovers safely",()=>{
 const f=fixture(),s=f.api.create(pitchSchema);s.save({range:"lower",selectedByRange:{lower:[],middle:[],upper:[72]}});
 equal(s.load().selectedByRange.lower,Array.from({length:25},(_,i)=>36+i));
 equal(s.load().selectedByRange.middle,[]);
});


const pairHTML=read("games/find-the-pair/index.html");
const pairSchema=schemaFromHTML(pairHTML,
  "const difficultyStorage=window.ArcadeSettings.create({",
  "const cards=[byId('card1')");
test("Find the Pair!: difficulty preference persists and validates all three modes",()=>{
  const f=fixture();
  const store=f.api.create(pairSchema);
  equal(store.load(),{level:"easy"});
  for(const level of ["easy","medium","hard"]){
    assert.equal(store.save({level}),true);
    equal(f.api.create(pairSchema).load(),{level});
  }
  store.save({level:"unknown",extra:"ignored"});
  equal(store.load(),{level:"easy"});
  store.save({});
  equal(store.load(),{level:"easy"});
  assert.notEqual(pairSchema.key,noteSchema.key);
  assert.notEqual(pairSchema.key,ccSchema.key);
});
test("Find the Pair!: corrupt or unavailable storage falls back to Easy",()=>{
  for(const record of ["{bad", "null", JSON.stringify({version:99,settings:{level:"hard"}})]){
    const f=fixture({[pairSchema.key]:record});
    equal(f.api.create(pairSchema).load(),{level:"easy"});
  }
  equal(fixture({}, {failRead:true,failWrite:true}).api.create(pairSchema).load(),{level:"easy"});
  const f=fixture({}, {failWrite:true});
  assert.equal(f.api.create(pairSchema).save({level:"hard"}),false);
  equal(f.api.create(pairSchema).load(),{level:"easy"});
  assert.ok(pairHTML.indexOf('src="../../shared/settings.js"') < pairHTML.indexOf("(function(){"));
  assert.ok(pairHTML.includes("difficultyStorage.load().level"));
  assert.ok(pairHTML.includes("difficultyStorage.save({level})"));
});
