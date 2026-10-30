# Do I Have Absolute Pitch?

The answer and selection keyboards cover 36 keys (three full octaves). New users
default to C4–B6; C3–B5 and C2–B4 are also available. Settings schema v4 preserves
v3 selections rather than silently adding notes to an existing custom pool.
The shared keyboard renderer computes key widths and scrollable minimum width
from `render(low, high)`; other games retain their 25-key ranges.

The game footer links to `learn.html`, a research-reading guide with original
one reusable 12-step practice panel (`training.js`). Its stage configuration,
sampling and scoring live in the DOM-independent `training-session.js`;
`training.js` owns controls, timers, completion marks and audio lifecycle.
Both learning keyboards use the shared renderer's `labelAll` mode. Piano
geometry, sound playback and button/ripple animation are shared with existing
music games; the guide has no separate synthesizer or keyboard implementation.
It cites Wong et al. (2025), DOI 10.3758/s13423-024-02620-2. The first scored pool is
E-flat/E/F/F-sharp/G across octaves 4–6. Later steps retain targets and add
E, F-sharp, E-flat, G, D, G-sharp, D-flat, A, C, B-flat and B in that order.
This roadmap applies our reading of the paper's alternating expansion rule;
it does not reproduce the paper's 24 levels per added name. Optional examples are unscored;
800 ms stimuli use 100 ms ramps through the shared audio engine's optional
duration parameter (existing callers keep their previous envelope). A single
response or timeout closes each trial; category accuracies and mean correct
response time are reported. Hidden-page trials are cancelled without scoring.
The 5-second post-stimulus window and 30-trial round (15 targets and 15
non-targets when available, shuffled) are preview choices: public materials do not specify
all initial-level rules. Each F appears five times; each non-target appears
at least once, with three randomly selected non-targets appearing twice.
Later stages sample each category in shuffled cycles; the last stage samples
30 of the 36 target keys without a Non-target answer. The round ends automatically after 30 scored trials. Cancelled trials return
to the pool, preserving the category balance. Restart clears the round.
The overview table lists all 12 steps; users mark and unmark completion manually.
There is no automatic completion threshold. The selected stage and completion
marks are stored in browser localStorage; storage failures do not block practice.
Table rows, arrows and a stage selector change the single outlined practice panel, cancel active audio/timers
and clear the round without carrying scores between stages. No automatic advancement.
Three buttons play the new note in octaves 4–6; a random-order button plays all
current target keys. Play Pitch and
the asymmetric ripple animation reuse `shared/music/pitch-playback.css` and
`pitch-playback.js`, also used by the keyboard game. Examples remain unscored
and may be replayed between completed trials without resetting the results.
The C4–B6 listening keyboard reuses the shared renderer and `keyboard.css`:
teal targets and pale yellow surrounding non-targets can be played; other keys are
disabled. Every key has its pitch label. Listening to individual non-targets is an arcade addition.
Run `node scripts/test_pitch_training.cjs` for scoring and deadline checks.
Scored target answers now use a separate C4–B6 piano: only teal target keys
are enabled while answering; the Non-target button is below it. Target answers
must match exact MIDI, including octave (an arcade rule beyond the study's
pitch-class response). A wrong octave is final and counted in Octave errors;
non-target trials accept only the Non-target button. Listening remains separate.
Game and guide explain their experimental status,
unverified output tuning, sample playback processing, and lack of accuracy or
training-outcome guarantees. These notices do not establish legal immunity.

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

Direct entry: games/do-i-have-absolute-pitch/index.html. The homepage includes a 1 Player card with a real browser screenshot in `assets/absolute-pitch-preview.jpg`, captured from the deployed game in its initial Play Pitch state and cropped to the game panel only (no surrounding page background or return button). The thumbnail uses contain sizing to keep the title, keyboard and score visible.
Listen to the mystery pitch, then match its note and octave. Tap the on-screen
keyboard, or enable the microphone icon to answer with a physical piano.
Play one note at a time. Hints retain the same low/high/correct colors in both modes.

Capture and detection use `shared/music/piano-input.js`, including its iPad
AudioSession handling and shared Low/Standard/High sensitivity options. Settings
save the sensitivity locally; microphone capture always requires an explicit click
after reload or returning from the background. Audio is processed on the device.

During mystery playback, microphone notes are ignored. Capture stays alive to
preserve the iPad audio session, but grading resumes only after the current audio
completion callback plus a 350 ms acoustic-tail guard. Replay and navigation cancel
stale callbacks. Physical-piano guesses do not produce duplicate speaker sounds.
Settings pause capture; page hiding stops it and returns to touch input.

Run `node scripts/test_absolute_pitch.cjs` and
`node scripts/test_absolute_pitch_microphone.cjs` from the repository root.
The microphone regression uses simulated capture events; verify permission,
speaker replay rejection, repeated notes, black keys, octaves, sensitivity and
background cleanup on a real iPad with a piano before release. The fixed tail guard
does not guarantee rejection of prolonged room reverberation; use headphones if needed.


Validation:

```sh
python3 scripts/check_site.py
node scripts/test_settings.cjs
node scripts/test_absolute_pitch.cjs
node scripts/test_absolute_pitch_microphone.cjs
node scripts/test_play_that_note.cjs
node scripts/test_music_modules.cjs
node scripts/test_name_that_note_audio.cjs
```

DOM fixture tests exercise actual handlers, selections, scoring, replay, loading,
and hints. The piano engine's audio lifecycle has separate regression tests.
The local inline preview uses shortened mono piano excerpts; those excerpts
are not shipped in this game. Actual iPad Safari audio and layout are verified
by device playtesting, not by the automated fixtures.
