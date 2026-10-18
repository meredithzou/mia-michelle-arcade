# Mia and Michelle's Arcade — repository instructions

This is a small non-commercial family website for two children, with a touch-first game library. Keep modifications simple, maintainable, and friendly to iPad Safari.

## Sources of truth
- The deployed website is the static source tree in this GitHub repository, served by GitHub Pages from `main` at `/`.
- The landing page is `index.html`. Each game is independent under `games/<slug>/index.html`.
- Existing games: `games/chicken-jockey-dash/` and `games/chinese-checkers/`.
- Screenshots go in `assets/`. Shared layout CSS is in `styles/base.css`.
- The **current approved home theme** is `themes/pastel-rainbow/theme.css`. Preserve it unchanged when making future seasonal themes; add `themes/halloween/`, `themes/christmas/`, etc. instead. Activate themes using `site-config.js`.
- Read `PROJECT_BRIEF.md` for product decisions and rollout expectations.

## Game expectations
- No keyboard is required. Primary input works by tapping and on iPad in landscape and portrait.
- Chinese Checkers is local multiplayer for 2–6 human players (NO AI). Two-player mode uses opposite camps. Long-jump (symmetric-distance) is an option/default; after each hop in a chain the player may stop immediately, even if other jumps are available. Retain playable sound effects and a mute toggle.
- Chicken Jockey Dash is a simple touch-friendly jump-and-dodge runner. Keep it distinct from other games.
- Each newly added game must get its own folder, assets, and a single card on the homepage with a useful screenshot and ONLY a player-count badge. Do not put deployment or Netlify instructions on the public homepage.
- Preserve the title `Mia and Michelle's Arcade`, the header `Welcome to our Game Corner`, and the approved low-profile footer disclaimer unless the owner asks for a change.

## Working practices
- Prefer small, reviewable changes rather than replacing entire games or redesigning the homepage.
- Use a task branch and pull request for changes; the owner reviews before merging to `main`. Never publish automatically without approval.
- After code changes, run `python3 scripts/check_site.py` and perform functional/touch checks appropriate to the changed game. Report what was actually tested and what was not.
- If a new theme or screenshot is created, compare a screenshot at iPad and phone widths. Protect the saved pastel-rainbow theme.
- Avoid adding frameworks, build systems, analytics, logins, third-party APIs, advertising, or data collection without explicit need and owner consent.
- No child personal data should be included in the repository. The site is public; all committed files are public.
- Copyright: no rights are granted by the non-commercial disclaimer. Existing Chicken Jockey imagery/name are Minecraft-associated; do not add third-party logos, game textures, audio, or brand assets without permission. When asked about public release, flag potential IP concerns rather than assuming non-commercial use grants a license.