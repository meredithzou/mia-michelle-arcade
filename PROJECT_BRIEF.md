# Project brief — Mia and Michelle's Arcade

## Purpose
Family-made mini games for Mia and Michelle to play on an iPad and occasionally share with known friends. This is a long-lived collection: many more games and themed homepages may be added over time. No advertising, logins, or collection of children's personal information. Optional website analytics are now approved for staged development, but collection remains disabled until a separate privacy review and explicit activation.

## Approved design, October 2026
- Public site title: **Mia and Michelle's Arcade**.
- Heading above title: **Welcome to our Game Corner**.
- Current background/theme: pastel-rainbow, with cute colorful gradient, two polished cards and screenshot previews inside inset rounded frames.
- Header pills: **iPad-friendly**, **Family-made**, **Just for fun**, **Made with ChatGPT**.
- Section: **Pick a game ✨**, no explanatory paragraph underneath.
- Current cards: **Chicken Jockey Dash** (1 Player) and **Chinese Checkers** (2–6 Players). Do not show Cluck & Dash on homepage.
- Player-count labels only; omit Original/Shareable and gameplay-tag pills.
- Footer text: “A small, non-commercial family project created with love for play and learning. If you have any copyright or licensing concerns, please contact mingzou.cn@gmail.com.”
- The site owner approves changes to the website design before merging. Prefer concise screenshots over long descriptions.

## Current games
- Chicken Jockey Dash: basic jumping/dodging runner, designed for tap input. Existing implementation is family-project prototype; Minecraft-related visual/IP issues require care on publicly served website.
- Chinese Checkers: local 2–6 humans, opposite camps for 2 players, symmetric-distance jumping, optional stop at any point in a multi-hop chain, jump sound effects/mute, turn and goal logic. Do not restore an older version with forced continuing hops.

## Repo architecture
- `index.html` homepage; `site-config.js` theme selector
- `styles/base.css` layout and shared styling
- `themes/pastel-rainbow/theme.css` approved default, immutable reference
- `assets/` screenshots
- `games/chicken-jockey-dash/index.html`
- `games/chinese-checkers/index.html`
- `scripts/check_site.py` minimum static checks

## Delivery workflow
1. Discuss and approve a game idea or a theme design in ChatGPT (voice-friendly).
2. Codex reads this repo and `AGENTS.md`, makes a branch/PR for the requested work.
3. Validate automated site checks and game interactions; provide screenshots when UI changes.
4. Owner reviews; only after approval merge to `main`.
5. GitHub Pages deploys updated `main` from repository root.

## Next increments (after first GitHub Pages launch)
- Verify game functions on iPad Safari and link/navigation/back behavior.
- Add a simple smoke test for Chinese Checkers multi-hop stop.
- Consider future Halloween/Christmas themes in separate folders, leaving the original pastel rainbow theme intact.
- Add new games one at a time, each independent.