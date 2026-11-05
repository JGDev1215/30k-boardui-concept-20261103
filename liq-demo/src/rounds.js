// Deterministic invented one-minute prices for a simulated five-session week.
// This is not NQ history or a market forecast. All future values are public in
// this static source file, even while the interface hides them until Reveal.
const MINUTE = 60_000;
const SESSION_MINUTES = 23 * 60;
const READ_MINUTE = 14 * 60;
const FIRST_OPEN = Date.parse('2026-10-04T22:00:00Z');
const labels = ['Mon 5 Oct', 'Tue 6 Oct', 'Wed 7 Oct', 'Thu 8 Oct', 'Fri 9 Oct'];
let seed = 0x51a7cafe;
let previousClose = 20000;

function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}

const tick = (price) => Math.round(price * 4) / 4;
const stamp = (millis) => new Date(millis).toISOString();

function makeSession(day) {
  const openAt = FIRST_OPEN + day * 24 * 60 * MINUTE;
  const bars = [];
  let price = tick(previousClose + (random() - .5) * 3);
  for (let minute = 0; minute < SESSION_MINUTES; minute++) {
    const open = price;
    // Modest noise throughout, then alternating directional examples after
    // the checkpoint. This creates varying bars without real data.
    const drift = minute < READ_MINUTE ? 0 : day % 2 === 0 ? .18 : -.18;
    const change = (random() + random() + random() + random() - 2) * 1.1 + drift;
    const close = tick(open + change);
    const high = tick(Math.max(open, close) + .25 + random() * .75);
    const low = tick(Math.min(open, close) - .25 - random() * .75);
    bars.push({ time: stamp(openAt + minute * MINUTE), open, high, low, close });
    price = close;
  }
  previousClose = price;
  return bars;
}

const sessions = Array.from({ length: 5 }, (_, day) => makeSession(day));

export const weekSummary = Object.freeze({
  firstBar: sessions[0][0].time,
  lastBar: sessions.at(-1).at(-1).time,
  sessionCount: sessions.length,
  barsPerSession: SESSION_MINUTES,
  barCount: sessions.reduce((count, bars) => count + bars.length, 0),
  readMinute: READ_MINUTE,
  calendar: 'Five simulated 22:00–21:00 UTC sessions, Sunday evening through Friday, with a 21:00–22:00 UTC daily pause.',
});

export const rounds = sessions.map((bars, day) => {
  const prefix = bars.slice(0, READ_MINUTE);
  const continuation = bars.slice(READ_MINUTE);
  const high = Math.max(...prefix.map((bar) => bar.high));
  const low = Math.min(...prefix.map((bar) => bar.low));
  const highAt = prefix.findLast((bar) => bar.high === high).time;
  const lowAt = prefix.findLast((bar) => bar.low === low).time;
  const base = {
    schema_version: 1,
    round_id: 'liq-sim-week-' + (day + 1),
    instrument: 'SIM',
    series: 'SYNTHETIC-1M',
    source: 'SYNTHETIC-TEST-ONLY',
  };
  return {
    id: '2026-10-' + String(day + 5).padStart(2, '0'),
    label: labels[day],
    snapshot: {
      ...base,
      fixture_notice: 'SYNTHETIC TEST VALUES ONLY; NOT HISTORICAL MARKET DATA. Demo target catalog: current simulated session high and low as of read.',
      read_at: continuation[0].time,
      end_at: stamp(Date.parse(continuation.at(-1).time) + MINUTE),
      inventory_complete: true,
      bars: prefix,
      levels: [
        { id: 'SESSION_HIGH', label: 'Session high', kind: 'POOL', side: 'BUY', trigger: high, formed_at: highAt, known_at: highAt, prior_touch: 'NONE' },
        { id: 'SESSION_LOW', label: 'Session low', kind: 'POOL', side: 'SELL', trigger: low, formed_at: lowAt, known_at: lowAt, prior_touch: 'NONE' },
      ],
    },
    continuation: { ...base, fixture_notice: 'SYNTHETIC TEST VALUES ONLY; NOT HISTORICAL MARKET DATA', bars: continuation },
  };
});
