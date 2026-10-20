# 🎮 Mia and Michelle's Arcade

A small family project created with love for play and learning, with touch-friendly games for iPad.

## Shared project wiki

Start at the [Arcade Wiki](docs/README.md). See the [game registry](docs/GAMES.md) for current names, paths and status, and the [ideas backlog](docs/IDEAS.md) for future work. Read [AGENTS.md](AGENTS.md) before making changes.

## Website structure

- `index.html` — the game library front page
- `site-config.js` — chooses which visual theme is active
- `styles/base.css` — shared layout and responsive styles
- `themes/pastel-rainbow/theme.css` — our original rainbow theme, saved permanently
- `assets/` — game card screenshots
- `games/chicken-jockey-dash/index.html` — chicken jumping game
- `games/chinese-checkers/index.html` — two-to-six-player Chinese Checkers with sound and optional stop after every jump

## Adding a new game

1. Add `games/new-game/index.html` and its optional assets.
2. Add a card linking to `games/new-game/index.html` in the homepage `index.html`.
3. Add a screenshot in `assets/`.

## Seasonal themes

Keep `themes/pastel-rainbow/` unchanged. When ready, add e.g. `themes/halloween/theme.css` defining the same theme variables (and any seasonal overrides), then change `activeTheme` in `site-config.js` to `halloween`. Switch back anytime by setting it to `pastel-rainbow`.

## GitHub Pages

Use the `main` branch and `/(root)` as the Pages publishing source in repository Settings → Pages.

**Copyright note:** This project is made for family fun and learning. Third-party intellectual property still requires appropriate permission. The Chicken Jockey game references Minecraft-associated character concepts; consider replacing that content with original characters before sharing publicly.