# 🎮 Mia and Michelle's Arcade

A family-made collection of touch-friendly browser games for kids and grown-ups. Designed for iPad and playable in a regular web browser.

**Play:** https://miamichellearcade.com/

## Games

| Game | What you do |
| --- | --- |
| [Chicken Jockey Dash](games/chicken-jockey-dash/) | Tap to jump over obstacles in a side-scrolling runner. |
| [Chinese Checkers](games/chinese-checkers/) | Play local, same-screen Chinese Checkers with 2–6 people. |
| [Name That Note!](games/name-that-note/) | Identify notes shown on a musical staff. |
| [Play That Note!](games/play-that-note/) | Find the displayed note on a piano keyboard. |
| [Do I Have Absolute Pitch?](games/do-i-have-absolute-pitch/) | Hear a pitch and choose the matching piano key. |
| [Find the Pair!](games/find-the-pair/) | Spot the one matching picture on two cards and collect 10 stars. |

## Project layout

- `index.html` — homepage and game links.
- `games/<game-slug>/` — independent, touch-first HTML/JavaScript games.
- `shared/music/` — reusable notation, piano audio, keyboard, and styling.
- `shared/settings.js` — browser-local game preference storage.
- `styles/`, `themes/`, `assets/` — site layout, themes, and previews.
- `analytics/` — optional-to-disable Cloudflare Web Analytics integration (see [analytics/README.md](analytics/README.md)).
- `scripts/` — static-site and game regression tests.

No app server, login, or build framework is required. Game preferences are stored in the visitor's own browser. The [Privacy page](privacy.html) describes aggregate website statistics.


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
```

GitHub Actions runs these checks on pull requests and pushes to `main`. Changes to games should also be tested on a real touch device, especially audio playback in iPad Safari.

## Hosting and forks

This repository is published through GitHub Pages. The root `CNAME` file connects the original website to `miamichellearcade.com`. **If you fork the project and publish your own site, remove or replace `CNAME` with a domain you control.** You can use a standard GitHub Pages URL without a custom domain.

## Intellectual property

This repository does not currently include a project-wide open-source license. Public visibility and the ability to fork on GitHub do not by themselves grant broad reuse rights. Some game concepts or assets reference third-party works; see notices in the relevant game files and `assets/licenses/`. Please respect those rights when adapting or redistributing content.
