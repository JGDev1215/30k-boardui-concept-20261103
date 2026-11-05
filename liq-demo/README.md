# LIQ synthetic mobile demo

Public, static phone preview of LIQ's decision flow. The two one-minute scenarios, prices and levels are entirely invented. They are not NQ history, a market forecast or a scored player record.

Open `index.html` through any static server. Choose a scenario, open its checkpoint, select a target, lock it in the interface, then reveal the synthetic continuation. The original LIQ scorer in `src/engine.js` determines the example result. The static lock is illustrative: `src/rounds.js` contains the invented future prices and anyone can inspect them before locking. No choice, rationale or history is transmitted or saved.

The package consists only of this README, `.nojekyll`, `index.html`, `style.css`, and three files under `src/`. It contains no historical database, live endpoint, local receipt or private HQ document.
