# Project overview

## Identity and purpose

Working project name: **Ming’s Arcade**. Public site title: **Mia and Michelle’s Arcade**.
A family-made collection of touch-friendly games, primarily for iPad Safari.

- Custom domain recorded in CNAME: https://miamichellearcade.com/
- GitHub Pages URL: https://meredithzou.github.io/mia-michelle-arcade/
- Repository: https://github.com/meredithzou/mia-michelle-arcade
- Publishing source: main, repository root. These addresses are configuration references; availability is not asserted by this document.

## Shared state

- [Game registry](GAMES.md): current names, stable IDs, paths and implementation state.
- [Backlog](IDEAS.md): game ideas and feature proposals.
- [Decision history](DECISIONS.md): dated decisions and evidence.
- [AGENTS.md](../AGENTS.md): repository engineering rules.

Keep changing game inventories and names in the registry rather than copying lists throughout the repository.

## Product and design

- Touch-first play with no required hardware keyboard; support iPad portrait and landscape.
- Keep games independent while sharing suitable settings/music utilities.
- Preserve the public title and “Welcome to our Game Corner” heading.
- Homepage cards use a screenshot and player-count badge; expose a new game on the homepage when Ming asks.
- Preserve the current compact footer (family project, contact, feedback, Privacy & Statistics). Do not restore obsolete non-commercial wording.
- Preserve pastel-rainbow as the original theme reference. Add seasonal themes in separate folders, selected via site-config.js.
- No advertising, logins, or collection of children’s personal information. Cloudflare Web Analytics provides basic aggregate statistics; game-event analytics require separate design/privacy review. See [analytics documentation](../analytics/README.md).

## Architecture

Static HTML/CSS/JavaScript, with no mandatory build framework.

| Location | Responsibility |
| --- | --- |
| index.html | Game library homepage |
| games/ | Independent game entry points and scripts |
| shared/settings.js | Reusable browser settings persistence |
| shared/music/ | Shared notation, pitch and piano audio |
| styles/, themes/, site-config.js | Shared presentation and theme selection |
| assets/ | Previews, icons and required license notices |
| scripts/ | Site and game checks |
| docs/ | Shared project wiki |

## Delivery and verification

Discuss → local preview/iteration for games and design → requested PR → Ming reviews and merges → GitHub Pages deployment.

This wiki task is authorized to prepare a documentation PR. Future implementation follows the owner’s current request and AGENTS.md. Do not auto-merge.

For code changes, run the site check plus tests appropriate to affected modules. UI changes need phone/iPad views and touch checks. Record what actually ran, including any real-device/audio gaps. Documentation-only changes need link, name, ID and consistency checks; no gameplay test is implied.
