# Mia and Michelle's Arcade — repository instructions

This is a small family website for two children, with a touch-first game library. Keep modifications simple, maintainable, and friendly to iPad Safari.

## Sources of truth
- The deployed website is the static source tree in this GitHub repository, served by GitHub Pages from `main` at `/`.
- The landing page is `index.html`. Each game is independent under `games/<slug>/index.html`.
- Current games, names, stable identities and paths are maintained in `docs/GAMES.md`; do not duplicate an inventory here.
- Screenshots go in `assets/`. Shared layout CSS is in `styles/base.css`.
- The **current approved home theme** is `themes/pastel-rainbow/theme.css`. Preserve it unchanged when making future seasonal themes; add `themes/halloween/`, `themes/christmas/`, etc. instead. Activate themes using `site-config.js`.
- Read `docs/README.md` and `docs/PROJECT.md` for shared project state, product decisions and rollout expectations.

## Cross-thread shared state
- Before project-status discussion or implementation, read the latest default-branch `docs/README.md`, `docs/GAMES.md`, `docs/IDEAS.md`, and relevant decisions in `docs/DECISIONS.md`. Check relevant open PRs. If unavailable, explicitly mark freshness unverified.
- Use stable IDs and current registry names; never invent or reassign existing G-numbers. Historical aliases do not create new games.
- Record explicit new user decisions with date/source. Keep accepted decisions, unimplemented features, merged code and verified deployment distinct.
- Update affected wiki records in the same PR as code. Decision-only changes can use a documentation PR within the authorized task. Never claim a shared update was saved without a commit/PR.
- Immediately before submitting/updating a PR, reread current main and overlapping work. Preserve unrelated changes and newer decisions. Resolve real conflicts before overwriting; never force-push over another thread.
- An open PR is a pending proposal, not main. Do not use a static PR table as a substitute for checking GitHub.
- Ordinary ChatGPT threads do not automatically load these rules or receive notifications. See `docs/CHATGPT_PROJECT_INSTRUCTIONS.md` for the Project-level bootstrap.

## Game expectations
- No keyboard is required. Primary input works by tapping and on iPad in landscape and portrait.
- Chinese Checkers is local multiplayer for 2–6 human players (NO AI). Two-player mode uses opposite camps. Long-jump (symmetric-distance) is an option/default; after each hop in a chain the player may stop immediately, even if other jumps are available. Retain playable sound effects and a mute toggle.
- Chicken Jockey Dash is a simple touch-friendly jump-and-dodge runner. Keep it distinct from other games.
- Each newly added game must get its own folder. Add its homepage card/assets only when Ming asks to expose it there; new games may remain accessible by direct URL during review. A homepage card uses a useful screenshot and ONLY a player-count badge. Do not put deployment or Netlify instructions on the public homepage.
- Preserve the title `Mia and Michelle's Arcade`, the header `Welcome to our Game Corner`, and the current compact family-project/contact/privacy footer unless the owner asks for a change.

## Game settings persistence
- Every game with user-adjustable Settings must save and restore those preferences
  on the same browser and device, even when the game is opened directly.
- Load `shared/settings.js` **before** the game's own script and use
  `window.ArcadeSettings.create(...)`; do not write a new localStorage wrapper
  for each game. The shared helper only handles storage, JSON records, errors
  and version negotiation; individual games own settings definitions.
- Each game must choose an independent namespaced key such as
  `arcade.settings.<game-slug>`, explicit schema version, defaults, validation,
  and any incompatible-version upgrades. Ignore unknown old fields and fall
  back safely for missing, corrupt or invalid values.
- Never allow blocked/full localStorage to stop gameplay. Do not store
  gameplay history, audio assets, personal/player information or highscores
  using this settings helper unless separately designed and approved.
- Preserve pre-existing saved preferences when migrating a game's older keys;
  do not delete legacy settings without an explicit reason and review.
- Update `scripts/test_settings.cjs` for every settings schema change and run
  both `node scripts/test_settings.cjs` and `python3 scripts/check_site.py`.
- Games with no adjustable Settings do not need to use this helper.

## Working practices
- Prefer small, reviewable changes rather than replacing entire games or redesigning the homepage.
- For every new Arcade game, develop locally and show a playable inline preview in Chat first. Iterate there until Ming is satisfied. Do not push, create a PR (including Draft), merge, or deploy until Ming explicitly requests that step. Use a task branch/PR only after that request; Ming reviews before merging to `main`. Never publish automatically.
- After code changes, run `python3 scripts/check_site.py` and perform functional/touch checks appropriate to the changed game. Report what was actually tested and what was not.
- If a new theme or screenshot is created, compare a screenshot at iPad and phone widths. Protect the saved pastel-rainbow theme.
- Avoid adding frameworks, build systems, analytics, logins, third-party APIs, advertising, or data collection without explicit need and owner consent.
- No child personal data should be included in the repository. The site is public; all committed files are public.
- Copyright: no rights are granted by the non-commercial disclaimer. Existing Chicken Jockey imagery/name are Minecraft-associated; do not add third-party logos, game textures, audio, or brand assets without permission. When asked about public release, flag potential IP concerns rather than assuming non-commercial use grants a license.