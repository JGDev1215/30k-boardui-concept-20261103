const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const detailClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' });

export function utcSeconds(time) {
  const seconds = Date.parse(time) / 1000;
  if (!Number.isFinite(seconds) || seconds % 60 !== 0) throw new Error('Chart needs a valid UTC minute');
  return seconds;
}

export const londonLabel = (seconds) => clock.format(seconds * 1000);
export const londonDetail = (seconds) => detailClock.format(seconds * 1000);

// Only the caller's explicit post-Reveal bars can expand the displayed data.
// The pre-Reveal path never reads a continuation, end time, or outcome.
export function chartData({ snapshot, levels, bars, eventTime }) {
  const read = utcSeconds(snapshot.read_at);
  const revealed = bars !== undefined;
  const source = revealed ? bars : snapshot.bars;
  let previous = -Infinity;
  const candles = source.map((bar) => {
    const time = utcSeconds(bar.time);
    if (time <= previous || (!revealed && time >= read)) throw new Error('Chart bars violate the checkpoint');
    previous = time;
    const candle = { time, open: bar.open, high: bar.high, low: bar.low, close: bar.close };
    if (![candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)
      || candle.low > Math.min(candle.open, candle.close) || candle.high < Math.max(candle.open, candle.close)) throw new Error('Invalid chart OHLC');
    return candle;
  });
  const targets = levels.map(({ id, label, side, trigger }) => ({ id, label, side, trigger }));
  const event = revealed && eventTime ? utcSeconds(eventTime) : null;
  return { read, revealed, candles, targets,
    data: revealed ? candles : [...candles, { time: read }],
    event: event !== null && candles.some((bar) => bar.time === event) ? event : null };
}

export function initialRange(model) {
  const readIndex = model.candles.findIndex((bar) => bar.time >= model.read);
  if (!model.revealed) return { from: Math.max(0, model.candles.length - 65), to: model.candles.length + 4 };
  const start = Math.max(0, readIndex - 25);
  const eventIndex = model.event === null ? model.candles.length - 1 : model.candles.findIndex((bar) => bar.time === model.event);
  return { from: start, to: Math.min(model.candles.length + 3, eventIndex + 12) };
}
