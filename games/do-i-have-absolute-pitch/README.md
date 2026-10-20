# Do I Have Absolute Pitch?

Hear one piano pitch, then tap its exact key, including the octave. Start the
first sound with Play Pitch; subsequent questions play automatically. The button
becomes Replay Pitch only after the current target finishes playing. Restart
and saved settings reset it to Play Pitch and wait for a tap. Replay
keeps the same question. Each answer key plays its own pitch, including wrong
answers. Rapid taps stop the previous sound before playing the next.

Choose C2–C4, C3–C5 (default), or C4–C6, then select practice notes on the
Settings keyboard. Contiguous and disconnected selections are supported.
Select All, White Only, Black Only, and Select None are shortcuts. Each window
remembers its own selection. Save & Play requires at least one selected note;
an empty selection shows an inline alert and keeps Settings open. Closing
Settings discards draft changes.

The answer keyboard retains the whole window; only selected notes become
questions. Every eligible MIDI pitch appears once per shuffled bag, with no
immediate repeat at bag boundaries unless only one pitch is selected.

Wrong attempts and Show Answer count the question as incorrect once. Correcting
an answer retains first-attempt accuracy. Audio is always enabled and recordings
must be ready before answering. The lightbulb toggles directional hints:
- On: teal for too low, purple for too high, green for correct.
- Off: red for any wrong answer without disclosing direction.

Hint and Settings have icon-only buttons. Their rounded square buttons match
Restart's responsive height. Hints on uses pale purple with a dark purple bulb;
hints off uses white. Restart retains its label.

Uses shared/music/audio.js (the same piano recordings and background recovery),
shared/music/keyboard.js, shared/music/practice.css, and shared/settings.js.
Preferences use arcade.settings.do-i-have-absolute-pitch, schema version 3,
including upgrades from local prototype v1/v2. Only preferences are stored.
All keys in the window are loaded so unselected wrong keys also produce audio.
Audio credits and loading/retry controls are available in Settings.

Direct entry: games/do-i-have-absolute-pitch/index.html. The homepage includes a 1 Player card with an SVG preview illustration.
Physical piano/microphone answer recognition remains a future extension.

Validation:

```sh
python3 scripts/check_site.py
node scripts/test_settings.cjs
node scripts/test_absolute_pitch.cjs
node scripts/test_play_that_note.cjs
node scripts/test_music_modules.cjs
node scripts/test_name_that_note_audio.cjs
```

DOM fixture tests exercise actual handlers, selections, scoring, replay, loading,
and hints. The piano engine's audio lifecycle has separate regression tests.
The local inline preview uses shortened mono piano excerpts; those excerpts
are not shipped in this game. Actual iPad Safari audio and layout are verified
by device playtesting, not by the automated fixtures.
