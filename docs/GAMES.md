# Game registry

Last reconciled: 2026-10-20 against main commit `8699ada6c7f28110f062599902f2306bbf2bcb5c`, homepage cards, and merged PRs #24–26. “Shipped” below means merged into main and linked from the homepage; live deployment was not separately tested in this reconciliation.

## Current games

| Stable ID | Current name | State | Canonical source |
| --- | --- | --- | --- |
| chicken-jockey-dash | Chicken Jockey Dash | ✅ Shipped | [Game](../games/chicken-jockey-dash/index.html) |
| chinese-checkers | Chinese Checkers | ✅ Shipped | [Game](../games/chinese-checkers/index.html) |
| name-that-note | Name That Note! | ✅ Shipped | [Game](../games/name-that-note/index.html) |
| G-003 | Play That Note! | ✅ Shipped; microphone feature remains an idea | [Game](../games/play-that-note/index.html) |

G-001…G-008 are existing Ideas-thread IDs, not release order. Do not assign G-002 to Name That Note!: G-002 already means Chord Challenge. The other three shipped games use the stable IDs above because no original G-number was verified. Keep these IDs stable through future renames.

## Naming and compatibility

| Stable ID | Historical names / aliases | Compatibility |
| --- | --- | --- |
| name-that-note | Name the Note; Music Note Challenge (early prototype) | [Old name-the-note URL](../games/name-the-note/index.html) redirects to canonical game |
| G-003 | Find the Note; Find That Note!; Play the Note / Play Your Note (conversation aliases) | [Old find-that-note URL](../games/find-that-note/index.html) redirects to canonical game |

Name That Note! rename and file changes were merged in [PR #25](https://github.com/meredithzou/mia-michelle-arcade/pull/25); Play That Note! rename was merged in [PR #26](https://github.com/meredithzou/mia-michelle-arcade/pull/26). Historical references in change history should remain historical; new prose uses current names.

## Product boundaries

- **Name That Note!**: read staff notation and choose a letter C–B. Keep it separate from the piano-keyboard game.
- **G-003 — Play That Note!**: read staff notation and tap the exact pitch on an on-screen piano, including octave and accidental. [Implementation details](../games/play-that-note/README.md).
- **G-003 microphone / real-piano input**: 💡 Idea, not shipped. Reuse the same notation, questions, and answer screen; offer Touch / On-screen Keyboard and Microphone / Real Piano inputs. Correct pitch advances; wrong pitch keeps the question. Recognized-note and pitch-difference feedback may be shown. No separate new game.
- **Chinese Checkers**: 2–6 humans sharing a device; no AI opponent. Preserve opposite camps for two players and ability to stop after any hop.
- **Chicken Jockey Dash**: touch runner with jump/dodge and scoring.

Future renames must update this registry, affected backlog references, source paths/assets where appropriate, homepage, internal links, tests, and compatibility redirects/settings migration as needed.
