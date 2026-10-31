# 🎮 Mia and Michelle's Arcade

A family-made collection of touch-friendly browser games for kids and grown-ups. Designed for iPad and playable in a regular web browser.

**Play:** https://miamichellearcade.com/

## Games

| Game | What you do |
| --- | --- |
| [Giant Little Garden](games/giant-little-garden/) | Plant seeds, water one patch or all six, and grow giant flowers and beanstalks. |
| [Domino Knockdown!](games/domino-knockdown/) | Draw a path of plain dominoes, push the chain, and watch it tumble. |
| [Marble Run Lab](games/marble-run-lab/) | Build a track, drop a marble, and follow its trail. |
| [Jigsaw Garden](games/jigsaw-garden/) | Fit 9, 16, or 25 pieces together, choose a scene, or use your own photo. |
| [Chicken Jockey Dash](games/chicken-jockey-dash/) | Tap to jump over obstacles in a side-scrolling runner. |
| [Chinese Checkers (跳棋)](games/chinese-checkers/) | Play local, same-screen Chinese Checkers with 2–6 people. |
| [Five in a Row (五子棋)](games/five-in-a-row/) | Play same-screen 五子棋 with two people, undo moves, and connect five to win. |
| [Chinese Chess (中国象棋)](games/chinese-chess/) | Play same-screen Chinese Chess with legal move hints, check warnings, undo, and board rotation. |
| [Name That Note!](games/name-that-note/) | Identify notes shown on a musical staff. |
| [Play That Note!](games/play-that-note/) | Find the displayed note on a piano keyboard. |
| [Piano Note Finder](games/piano-note-finder/) | Play one real piano note and see its name, octave, frequency and microphone level. |
| [Do I Have Absolute Pitch?](games/do-i-have-absolute-pitch/) | Hear a pitch and answer using the on-screen keyboard or a real piano through the microphone. |
| [Find the Pair!](games/find-the-pair/) | Spot the one matching picture on two cards and collect 10 stars. |

## Homepage collections

The homepage groups games into **From an Idea to a Game** (Chicken Jockey Dash, Find the Pair!, Jigsaw Garden, Marble Run Lab, Domino Knockdown!), **Family Classics** (Chinese Checkers, Five in a Row, Chinese Chess), and **The Music Box** (the music games/tools). Keep new cards in the appropriate collection, with Piano Note Finder last in the music collection. `styles/home.css` gives cards an equal height and three/two/one columns at desktop/tablet/phone widths.

## Project layout

- `index.html` — homepage and game links.
- `games/<game-slug>/` — independent, touch-first HTML/JavaScript games.
- `shared/music/` — reusable notation, piano audio, keyboard, and styling.
- `shared/settings.js` — browser-local game preference storage.
- `styles/`, `themes/`, `assets/` — site layout, themes, and previews.
- `analytics/` — optional-to-disable Cloudflare Web Analytics integration (see [analytics/README.md](analytics/README.md)).
- `scripts/` — static-site and game regression tests.

No app server, login, or build framework is required. Game preferences are stored in the visitor's own browser. The [Privacy page](privacy.html) describes aggregate website statistics.



## Homepage image and layout CSS cache busting

Homepage images use URLs like `assets/example-preview.png?v=abcdef123456`. The 12-character version is computed from the image's Git blob content hash, so changing a screenshot automatically yields a new URL for browsers without renaming the actual image. There is no build system or runtime JavaScript.

After changing a homepage image or a stylesheet in `styles/`, run:

```sh
python3 scripts/update_preview_versions.py
python3 scripts/update_preview_versions.py --check
```

Commit the regenerated `index.html` with the asset change. The same content-hash versioning covers layout stylesheet links in `styles/`. Shared `.game-title-icon` CSS is the single source for title icon size, spacing, and alignment; do not duplicate those values inline. CI verifies the versions and fails if any image or layout stylesheet URL is stale; **never edit a version number by hand**. As with any GitHub Pages update, browsers still need to fetch the latest HTML after deployment before seeing the new URL.

## Shared return button

Every playable game uses `shared/arcade-nav.css` and the same top-left, pill-shaped return link, with a 44px touch target, safe-area spacing, and keyboard focus outline. The button occupies a reserved row at the top of the document and scrolls offscreen with the page; never use fixed or sticky positioning for it. Colors may differ using `--arcade-return-bg`, `--arcade-return-color`, and `--arcade-return-focus`; keep geometry and text shared. Use `class="arcade-game-page"` on the body and exactly one `<a class="arcade-return" href="../../index.html">← Mia and Michelle’s Arcade</a>`. Load the shared stylesheet after game styles. Legacy redirect pages are exempt.

## Quality checks for every game

`scripts/check_site.py` automatically discovers `games/*/index.html` and checks each playable game for:

- A nonempty browser page title and mobile viewport metadata.
- A labeled link back to the Arcade homepage (`../../index.html`).
- Exactly one Cloudflare analytics config and loader, in the correct order.
- Valid relative HTML links to local scripts, stylesheets, images, and other resources.
- Homepage game cards, names, previews, player badges, and README's published-game catalog remain consistent.
- Numeric game-count claims in the homepage, README, and analytics documentation match the number of published homepage cards.

Legacy URL redirects are explicitly exempt from the playable-game rules and must point to their intended destination. A game can remain unlisted on the homepage during development; homepage cards are not mandatory for every game.

These checks validate HTML structure, **not** runtime interaction. New or modified games still need manual touch, sound, gameplay, and layout testing on target devices.

## Running and checking the site

Serve the repository root with a static web server, or use GitHub Pages. From the repository root, run:

```sh
python3 scripts/check_site.py
node scripts/test_settings.cjs
node scripts/test_music_modules.cjs
node scripts/test_name_that_note_audio.cjs
node scripts/test_play_that_note.cjs
node scripts/test_absolute_pitch.cjs
node scripts/test_absolute_pitch_microphone.cjs
node scripts/test_piano_input.cjs
node scripts/test_piano_note_finder.cjs
node scripts/test_audio_session_capture.cjs
node scripts/test_play_that_note_microphone.cjs
node scripts/test_find_the_pair.cjs
node scripts/test_marble_run.cjs
node scripts/test_chinese_chess.cjs
python3 scripts/test_homepage_layout.py
python3 scripts/test_preview_versions.py
python3 scripts/update_preview_versions.py --check
```

GitHub Actions runs these checks on pull requests and pushes to `main`. Changes to games should also be tested on a real touch device, especially audio playback in iPad Safari.

## Hosting and forks

This repository is published through GitHub Pages. The root `CNAME` file connects the original website to `miamichellearcade.com`. **If you fork the project and publish your own site, remove or replace `CNAME` with a domain you control.** You can use a standard GitHub Pages URL without a custom domain.

## Intellectual property

This repository does not currently include a project-wide open-source license. Public visibility and the ability to fork on GitHub do not by themselves grant broad reuse rights. Some game concepts or assets reference third-party works; see notices in the relevant game files and `assets/licenses/`. Please respect those rights when adapting or redistributing content.
