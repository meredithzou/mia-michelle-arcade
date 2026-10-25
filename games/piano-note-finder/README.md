# Piano Note Finder

One-note microphone tool: note name and octave, enharmonic black-key label,
frequency, captured-note RMS in dBFS, and live input level. No scoring or tuning
comparison. A4 reference is 440 Hz; dBFS is not calibrated room loudness.

Low / Standard / High sensitivity gates are RMS .012 / .003 / .001.
Only sensitivity persists under arcade.settings.piano-note-finder version 1.
Microphone permission and activation are never stored or started automatically.

The reusable shared/music/piano-input.js owns monophonic YIN analysis, volume
and confidence gates, 200 ms stability and release gating. It has no game DOM or
rules. start/stop/reset/setThreshold/destroy operate locally without uploads.
Page hiding or navigation stops capture; returning requires a new Listen tap.
Late permission responses are cancelled and their tracks stopped.

Synthetic tests cover all 88 piano keys at 44.1 and 48 kHz. Physical piano
harmonics, room acoustics and tuning can cause errors; voice/background music
may also produce a pitched result. One note at a time, ideally without pedal.
This is an experimental note display, not a precision piano tuner.

Bravura title glyphs use the existing assets/licenses/bravura-OFL.txt license.
No prerecorded sound is used. Analytics sends page statistics only.
