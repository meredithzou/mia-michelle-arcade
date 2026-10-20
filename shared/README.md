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

- **Name That Note!:** clef, treble/bass ranges, note durations, sound On/Off.
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

## Music modules

Music games remain independent under `games/<slug>/`. Their `game.js` owns
questions, answer rules, score, screen state, settings schema, and the loading UI.
The following classic scripts load in order after `shared/settings.js`:

| Script | Global | Contract |
| --- | --- | --- |
| `music/pitch.js` | `ArcadeMusicPitch` | `letters`, `name(staffIndex)`, `midi(staffIndex)` |
| `music/notation.js` | `ArcadeMusicNotation` | Stateless SVG staff, clef, ledger-line and note rendering |
| `music/audio.js` | `ArcadeMusicAudio` | `create({root,isEnabled,getQuestion,onStateChange})` |

A piano engine accepts **MIDI numbers**, never diatonic staff indices. Its public
methods are `play(midi)`, `wrong()`, `samplesFor(pitches)`, `readiness(pitches)`,
`prepare(pitches, priorityMidi)`, `retry(pitches)`, and `setEnabled(enabled)`.
The game updates its own sound preference before calling `setEnabled`.
`getQuestion` returns the current question identity, so stale pending playback
is canceled when a game moves on. Loading/error display belongs to the game;
the engine reports readiness and calls `onStateChange` as recordings settle.

Contexts, buffers, pending loads and lifecycle recovery belong to the engine,
not individual game files. It preserves the latest foreground recovery from
PR #22: a backgrounded playback context is replaced once in the next gesture,
while decoded recordings survive. Ordinary playback performs no per-note
context-state polling. The existing sample source/version and attribution
remain unchanged. Loading still requires access to the external recording CDN.

No build step, framework, shared game superclass, or bundled inline recordings
are added. Existing settings keys/schema and the homepage remain unchanged.

Run `node scripts/test_music_modules.cjs` and
`node scripts/test_name_that_note_audio.cjs` alongside the settings/site checks.
The module regression test checks SVG geometry against a digest generated from
pre-refactor main, the actual Name That Note! handlers, and the public piano API.
These checks do not replace an actual iPad Safari playtest.

Do I Have Absolute Pitch? shares `music/keyboard.js` and
`music/practice.css` with Play That Note! The existing keyboard global remains
`PlayThatNoteKeyboard` for compatibility. `audio.stop()` cancels pending playback
and stops active notes, allowing replay and Settings to avoid overlapping sound.
