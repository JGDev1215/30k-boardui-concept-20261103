# LIQ synthetic mobile demo

Public, static phone preview of LIQ's decision flow. `src/rounds.js` deterministically generates **6,900 invented one-minute OHLC bars** over five 23-hour simulated sessions: Sunday 4 October 2026 22:00 UTC through Friday 9 October 2026 21:00 UTC, with a 21:00–22:00 UTC daily pause. There are 1,380 bars per session and one playable checkpoint per Monday–Friday trade date at 12:00 UTC. Each round uses all 840 bars before the choice to determine that session's high and low and all 540 later bars for scoring; the phone chart shows a recent slice to stay readable. This is a deliberately small two-target demo catalog, not LIQ's historical catalog. The series is wholly invented, not NQ history or a market forecast.

Serve `index.html` with any static server. Choose a day, tap the session high or low, lock it, then reveal the simulated continuation. `src/engine.js` scores the target against the opposing side. The static lock is illustrative: the generator and invented future prices are public and can be inspected before locking. Choices are neither transmitted nor saved.

The package consists only of this README, `.nojekyll`, `index.html`, `style.css`, and three files under `src/`. It contains no historical database, live endpoint, local receipt or private HQ document.
