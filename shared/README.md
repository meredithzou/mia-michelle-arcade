# Shared game settings

Use `shared/settings.js` to remember game preferences **locally on the
same browser and device**. The helper only handles a JSON storage record,
version, migration hook and browser storage failures. **Every game defines
its own complete Settings schema.**

## In a game's HTML

Load the helper before the game's JavaScript:

```html
<script src="../../shared/settings.js"></script>
```

Register an independent key and version inside the game:

```js
const defaults = { sound: true, speed: 2 };
const settingsStore = window.ArcadeSettings.create({
  key: "arcade.settings.my-new-game",
  version: 1,
  defaults,
  normalize: (saved, defaults) => ({
    sound: typeof saved.sound === "boolean" ? saved.sound : defaults.sound,
    speed: Number.isInteger(saved.speed) && saved.speed >= 1 && saved.speed <= 5
      ? saved.speed : defaults.speed
  })
});
let settings = settingsStore.load(); // before first game render
settings.sound = false;
settingsStore.save(settings); // after confirmed setting change
```

## Contract

- Keys are separate per game and scoped to the site's browser origin.
- The record is `{ "version": 1, "settings": { ... } }`.
- A game validates every saved field using its own `normalize` function.
  Unknown/removed fields are ignored and missing fields get defaults.
- If the schema changes incompatibly, bump `version` and provide an optional
  `upgrade(oldVersion, oldSettings)` function.
- For pre-existing legacy keys, define an optional `migrateLegacy(storage)`.
  Import once when no new-format record exists. Never remove the legacy keys
  automatically.
- `load` always returns a safely copied object. `save` returns `true` or
  `false`, and does not throw on browser storage failures.
- This is for settings **only**. Do not store child information, account data,
  scores, session progress or audio data here by default.
- An iPad Safari browser profile stores its own preferences. Other devices,
  browsers, or private browsing sessions do not share them.

## Current integrations

- **Name the Note:** clef, treble/bass ranges, note durations, sound On/Off.
  Apply saves all settings; sound changes are applied and saved immediately.
- **Chinese Checkers:** language, sound, move hints, player count, jump rule.
  Migrates the five `cc-v17-*` keys automatically, leaving them untouched.
- **Chicken Jockey Dash:** unchanged. Its existing high-score key
  `cj-dash-best` remains independent; no adjustable settings exist.

## Validation

Run:

```sh
node scripts/test_settings.cjs
python3 scripts/check_site.py
```

GitHub Actions also runs these checks for every PR.

## Shared music notation

`music-notation.js` owns the SVG clefs, noteheads, ledger lines, staff rendering,
natural pitch names/MIDI conversion, and accidental paths used by both music games.
It contains no game state, storage, audio context, or question selection.
The original rendering functions are extracted unchanged from Name the Note.

Find That Note uses its own `arcade.settings.find-that-note` key for clef, bounded
note ranges, durations, accidental selection, and sound; Name the Note preferences
remain independent.
