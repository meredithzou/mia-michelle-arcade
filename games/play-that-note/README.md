# Play That Note!

Single-note staff-to-piano practice. A correct answer matches the exact MIDI pitch,
including its octave and accidental. No chords or physical keyboard are required.

- Stable two-octave keyboard: treble C4–C6, bass C2–C4; 15 white and 10 black keys.
- Adjustable staff-note bounds within that window. Settings choose naturals alone,
  naturals with sharps, naturals with flats, or all three (default).
- Individual questions are independent; accidentals apply only to that question.
  No key signatures, double accidentals, or accidental carryover between questions.
- Enharmonic spellings are valid, including E♯/F, B♯/C, C♭/B and F♭/E.
  Spellings whose sounding pitch falls beyond the keyboard endpoints are excluded.
- Wrong attempts and Show Answer count the question as incorrect once. A correct
  retry completes it without changing the original first-attempt accuracy.
- The toolbar microphone toggle enables optional physical-piano answers. Screen
  keys stay visible as feedback, but cannot be tapped or scored in this mode.
  Recognition follows the same exact-pitch and first-attempt scoring rules.
- Settings offer Low / Standard / High microphone sensitivity with the same
  RMS thresholds as Piano Note Finder (0.012 / 0.003 / 0.001). Standard is the
  default; the choice is saved per game. Higher sensitivity can pick up more
  background noise. The screen omits live pitch/volume diagnostics.
- Microphone access starts only after a user action and browser permission;
  reload never starts capture. Settings, backgrounding and page exit stop it.
  Closing/applying Settings can resume capture from that user gesture. Game
  feedback audio is suppressed in microphone mode to avoid self-triggering.
- Audio is analyzed locally by the existing shared music/piano-input.js module,
  with no recording, persistence or upload. A Privacy note appears below the game.
  Microphone capture requires HTTPS (or localhost) and browser support.
- Keyboard minimum width is 630px to preserve touch targets. On narrow phones,
  scroll the keyboard horizontally; iPad portrait/landscape can show all keys.
- Shared settings and notation are loaded directly, so the game works without
  visiting the homepage. Other music-game preferences are never changed.
- Staff, range diagrams, noteheads and clefs use `shared/music/notation.js`.
  The piano loading, sample credit, mute, and event-driven interruption recovery
  follow Name That Note!'s implementation; samples need external network access.

Notation reference: [Open Music Theory — Half Steps, Whole Steps, and Accidentals](https://viva.pressbooks.pub/openmusictheory/chapter/half-and-whole-steps/).
Accidentals appear immediately left of the notehead, aligned to its staff position.
The game is available from its own homepage card and directly at
`games/play-that-note/`. The card uses a browser capture of the running game.
The previous game URL redirects here. Preferences migrate once from the previous
storage key to `arcade.settings.play-that-note`; the legacy record is retained.

`game.js` owns the question pool, rules, score and settings. `shared/music/keyboard.js` owns
key layout/feedback and reports MIDI pitches. `shared/music/practice.css` supplies
the common music practice layout. Shared `music/audio.js` owns the
piano engine, including the latest background return/context recovery from main.
The shipped game streams the original recordings; inline-demo excerpts are not
committed to this game. Bravura accidental outlines retain their OFL notice in
`assets/licenses/bravura-OFL.txt`.

Validation:

```sh
python3 scripts/check_site.py
node scripts/test_settings.cjs
node scripts/test_play_that_note.cjs
node scripts/test_play_that_note_microphone.cjs
node scripts/test_piano_input.cjs
node scripts/test_name_that_note_audio.cjs
node scripts/test_music_modules.cjs
```

The DOM fixture tests actual game handlers and notation. A Chromium browser
review also checked real key hit targets, Settings, source-recording decoding,
homepage entry links and screenshots at phone, iPad portrait and landscape
widths. Audio requests in that review used a local mirror of the original
recordings; it did not validate live-CDN delivery or audible speaker output.
Real iPad Safari audio recovery still needs a device playtest.
