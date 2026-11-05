# LIQ synthetic 06:46 London demo

This static phone demo generates **6,900 invented one-minute OHLC bars** over five simulated 23-hour sessions, from Sunday 4 October 2026 22:00 UTC through Friday 9 October 2026 21:00 UTC. A one-hour simulated pause separates sessions. All prices, levels and outcomes are invented; this is not NQ history or a market forecast.

Tap **Play** to open the next prepared scenario. Each uses the market as of **06:46 Europe/London** on its Monday–Friday date. The latest complete bar is stamped 06:45 London. The five October reads are 05:46 UTC, with **466 earlier bars and 914 later bars** per session. The full pre-read chart can be swiped. Tap a target, Lock choice, then Reveal result; Next scenario advances through the week without a date or time-zone form.

The sample catalog has only the current simulated session high and low. It marks a repeated extreme TOUCHED rather than treating the last repeat as a new target, and marks each extreme known at its minute close. The generator checks every expected minute and OHLC value before declaring a sample ready. The score compares the locked target against the opposing eligible target until that **simulated session ends**. This is a demo-only bounded window, not an approved historical LIQ trading rule. If neither side is reached, the screen says **UNRESOLVED**. The real historical catalog is broader and is not represented by these two targets.

The full invented series is fixed before any checkpoint is sliced. Future candles are hidden by the interface until Reveal, but anyone can inspect them in these public static files; the lock is illustrative. Choices are neither transmitted nor saved. No historical database, receipt, secret or HQ file belongs in the published artifact.

To view locally, serve this directory with a static HTTP server. The development tests are retained in the private LIQ workspace and are not part of the public Pages artifact.

The chart uses pinned TradingView Lightweight Charts 5.2.1, shipped under `vendor/` with Apache license, release NOTICE and the bundled fancy-canvas MIT license. Its candle pane shows only the closed snapshot until Reveal, with London labels, labelled targets, pan/pinch, zoom/reset controls and a DOM OHLC readout. The chart does not calculate the game result.
