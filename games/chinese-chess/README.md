# Chinese Chess (中国象棋)

Two people play on the same iPad or browser, with Red moving first. Tap a piece, then a highlighted destination. Includes legal move hints, check warnings, undo, board rotation, restart, and Chinese rules.

Movement covers chariot lines, horse-leg blocking, elephant-eye blocking and river restriction, palace boundaries, cannon screens, soldiers crossing the river, flying generals, and moves exposing your own general. Having no legal move loses, including stalemate.

Long-check, long-chase, repetition, and other tournament draw adjudication are not automated; players must agree on a draw. There is no AI opponent, saved position, or cross-device play.

Uses `../../shared/arcade-nav.css`, with brown color variables only, and the shared aggregate analytics scripts. No game state is persisted.

Run `node scripts/test_chinese_chess.cjs` and `python3 scripts/check_site.py` from the repository root.
