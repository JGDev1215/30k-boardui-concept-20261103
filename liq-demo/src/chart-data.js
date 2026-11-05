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
export const TIMEFRAMES = Object.freeze([1, 3, 5, 15, 30]);

export function aggregateCandles(minutes, interval) {
  if (!TIMEFRAMES.includes(interval)) throw new Error("Unsupported chart interval");
  const span = interval * 60;
  const candles = [];
  let previous = null;
  for (const bar of minutes) {
    if (previous !== null && bar.time !== previous + 60) throw new Error("Missing minute or session break in chart data");
    previous = bar.time;
    const time = Math.floor(bar.time / span) * span;
    let candle = candles.at(-1);
    if (!candle || candle.time !== time) {
      candle = { time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, first: bar.time, end: bar.time + 60 };
      candles.push(candle);
    } else {
      candle.high = Math.max(candle.high, bar.high);
      candle.low = Math.min(candle.low, bar.low);
      candle.close = bar.close;
      candle.end = bar.time + 60;
    }
  }
  return candles.map(bar => ({ ...bar, partial: bar.first !== bar.time || bar.end !== bar.time + span }));
}

export function chartData({ snapshot, levels, bars, eventTime, interval = 1 }) {
  const read = utcSeconds(snapshot.read_at);
  const revealed = bars !== undefined;
  const source = revealed ? bars : snapshot.bars;
  let previous = -Infinity;
  const minutes = source.map((bar) => {
    const time = utcSeconds(bar.time);
    if (time <= previous || (!revealed && time >= read)) throw new Error('Chart bars violate the checkpoint');
    previous = time;
    const candle = { time, open: bar.open, high: bar.high, low: bar.low, close: bar.close };
    if (![candle.open, candle.high, candle.low, candle.close].every(Number.isFinite)
      || candle.low > Math.min(candle.open, candle.close) || candle.high < Math.max(candle.open, candle.close)) throw new Error('Invalid chart OHLC');
    return candle;
  });
  const candles = aggregateCandles(minutes, interval);
  const span = interval * 60;
  const targets = levels.map(({ id, label, side, trigger }) => ({ id, label, side, trigger }));
  const actualEvent = revealed && eventTime ? utcSeconds(eventTime) : null;
  const eventAt = actualEvent !== null && minutes.some(bar => bar.time === actualEvent) ? actualEvent : null;
  const event = eventAt === null ? null : Math.floor(eventAt / span) * span;
  const readBucket = Math.floor(read / span) * span;
  let bucketIndex = candles.findIndex(bar => bar.time === readBucket);
  if (bucketIndex < 0) bucketIndex = candles.length;
  const cutoff = bucketIndex + (read - readBucket) / span - .5;
  const data = candles.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }));
  if (!revealed && interval === 1) data.push({ time: read });
  const last = candles.at(-1);
  const partialNotice = !revealed && last?.partial
    ? `Partial ${londonLabel(last.first)}–${londonLabel(last.end)} London · known at 06:46` : '';
  return { read, revealed, candles, targets, data, event, eventAt, interval, cutoff,
    sourceMinutes: minutes.length, sourceLast: minutes.at(-1)?.time ?? null, partialNotice };
}

export function initialRange(model) {
  const readIndex = Math.floor(model.cutoff + .5);
  if (!model.revealed) return { from: Math.max(0, model.candles.length - 65), to: model.candles.length + 4 };
  const start = Math.max(0, readIndex - 25);
  const eventIndex = model.event === null ? model.candles.length - 1 : model.candles.findIndex((bar) => bar.time === model.event);
  return { from: start, to: Math.min(model.candles.length + 3, eventIndex + 12) };
}
