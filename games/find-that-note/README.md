# Find That Note!

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
- Keyboard minimum width is 630px to preserve touch targets. On narrow phones,
  scroll the keyboard horizontally; iPad portrait/landscape can show all keys.
- Shared settings and notation are loaded directly, so the game works without
  visiting the homepage. Other music-game preferences are never changed.
- Staff, range diagrams, noteheads and clefs use `shared/music/notation.js`.
  The piano loading, sample credit, mute, and event-driven interruption recovery
  follow Name the Note's implementation; samples need external network access.

Notation reference: [Open Music Theory — Half Steps, Whole Steps, and Accidentals](https://viva.pressbooks.pub/openmusictheory/chapter/half-and-whole-steps/).
Accidentals appear immediately left of the notehead, aligned to its staff position.
The game is intentionally absent from the homepage in this change.
After merge, open `games/find-that-note/` directly.

`game.js` owns the question pool, rules, score and settings. `keyboard.js` owns
key layout/feedback and reports MIDI pitches. Shared `music/audio.js` owns the
piano engine, including the latest background return/context recovery from main.
The shipped game streams the original recordings; inline-demo excerpts are not
committed to this game. Bravura accidental outlines retain their OFL notice in
`assets/licenses/bravura-OFL.txt`.

Validation:

```sh
python3 scripts/check_site.py
node scripts/test_settings.cjs
node scripts/test_find_that_note.cjs
node scripts/test_name_the_note_audio.cjs
node scripts/test_music_modules.cjs
```

The DOM fixture tests actual game handlers and notation, but does not test CSS
layout, browser touch hit testing, audible output, or real iPad Safari recovery.
Those require a browser/device playtest before merging.
