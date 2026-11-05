// Deterministic invented one-minute prices for a simulated five-session week.
// The full series is generated before a dated London checkpoint is calculated.
// This static file is inspectable: its interface lock cannot conceal the future.
const MINUTE = 60_000;
const SESSION_MINUTES = 23 * 60;
const FIRST_OPEN = Date.parse('2026-10-04T22:00:00Z');
const labels = ['Mon 5 Oct', 'Tue 6 Oct', 'Wed 7 Oct', 'Thu 8 Oct', 'Fri 9 Oct'];
const londonClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
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

export function londonReadUtc(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('invalid London date');
  // 06:46 in London is either 05:46Z (BST) or 06:46Z (GMT).
  const candidates = [5, 6].map((hour) => Date.parse(`${date}T${String(hour).padStart(2, '0')}:46:00Z`));
  const found = candidates.filter((at) => {
    if (!Number.isFinite(at)) return false;
    const parts = Object.fromEntries(londonClock.formatToParts(at).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` === `${date} 06:46`;
  });
  if (found.length !== 1) throw new Error(`cannot resolve 06:46 London on ${date}`);
  return stamp(found[0]);
}

function makeSession(day) {
  const openAt = FIRST_OPEN + day * 24 * 60 * MINUTE;
  const bars = [];
  let price = tick(previousClose + (random() - .5) * 3);
  const anchor = price;
  for (let minute = 0; minute < SESSION_MINUTES; minute++) {
    const open = price;
    // A fixed simulated morning stays near its opening anchor. A later fixed
    // trend supplies varied examples; neither regime uses the read checkpoint.
    const noise = (random() + random() + random() + random() - 2) * .85;
    const change = minute < 500 ? noise + (anchor - open) * .08
      : noise + (day % 2 === 0 ? .13 : -.13);
    const close = tick(open + change);
    let high = tick(Math.max(open, close) + .25 + random() * .5);
    let low = tick(Math.min(open, close) - .25 - random() * .5);
    // Two unique, previously untouched morning pools in this invented series.
    if (minute === 130) high = tick(Math.max(high, anchor + 10));
    if (minute === 310) low = tick(Math.min(low, anchor - 10));
    bars.push({ time: stamp(openAt + minute * MINUTE), open, high, low, close });
    price = close;
  }
  previousClose = price;
  return bars;
}

function validateSession(bars, openAt) {
  if (!Array.isArray(bars) || bars.length !== SESSION_MINUTES) throw new Error('incomplete simulated session');
  bars.forEach((bar, minute) => {
    if (Date.parse(bar.time) !== openAt + minute * MINUTE) throw new Error(`missing or reordered minute ${minute}`);
    if (![bar.open, bar.high, bar.low, bar.close].every(Number.isFinite)
      || bar.low > Math.min(bar.open, bar.close) || bar.high < Math.max(bar.open, bar.close)) {
      throw new Error(`invalid OHLC minute ${minute}`);
    }
  });
}

function extremeLevel(prefix, field, side, id, label) {
  const trigger = side === 'BUY'
    ? Math.max(...prefix.map((bar) => bar[field]))
    : Math.min(...prefix.map((bar) => bar[field]));
  const first = prefix.findIndex((bar) => bar[field] === trigger);
  const priorTouch = prefix.slice(first + 1).some((bar) => side === 'BUY'
    ? bar.high >= trigger : bar.low <= trigger);
  return {
    id, label, kind: 'POOL', side, trigger,
    formed_at: prefix[first].time,
    known_at: stamp(Date.parse(prefix[first].time) + MINUTE),
    prior_touch: priorTouch ? 'TOUCHED' : 'NONE',
  };
}

export function buildRound(bars, day) {
  const date = `2026-10-${String(day + 5).padStart(2, '0')}`;
  const openAt = FIRST_OPEN + day * 24 * 60 * MINUTE;
  validateSession(bars, openAt);
  const readAt = Date.parse(londonReadUtc(date));
  const readMinute = (readAt - openAt) / MINUTE;
  if (!Number.isInteger(readMinute) || readMinute <= 0 || readMinute >= SESSION_MINUTES) {
    throw new Error('London checkpoint is outside simulated session');
  }
  const prefix = bars.slice(0, readMinute);
  const continuation = bars.slice(readMinute);
  const base = {
    schema_version: 1, round_id: `liq-sim-london-${date}`,
    instrument: 'SIM', series: 'SYNTHETIC-1M', source: 'SYNTHETIC-TEST-ONLY',
  };
  return {
    id: date, label: labels[day], readMinute,
    snapshot: {
      ...base,
      fixture_notice: 'SYNTHETIC TEST VALUES ONLY; NOT HISTORICAL MARKET DATA. Demo catalog: current simulated session high and low as of 06:46 London.',
      read_at: stamp(readAt),
      end_at: stamp(openAt + SESSION_MINUTES * MINUTE),
      inventory_complete: true,
      bars: prefix,
      levels: [
        extremeLevel(prefix, 'high', 'BUY', 'SESSION_HIGH', 'Session high'),
        extremeLevel(prefix, 'low', 'SELL', 'SESSION_LOW', 'Session low'),
      ],
    },
    continuation: { ...base, fixture_notice: 'SYNTHETIC TEST VALUES ONLY; NOT HISTORICAL MARKET DATA', bars: continuation },
  };
}

const sessions = Array.from({ length: 5 }, (_, day) => makeSession(day));
export const weekSummary = Object.freeze({
  firstBar: sessions[0][0].time,
  lastBar: sessions.at(-1).at(-1).time,
  sessionCount: sessions.length,
  barsPerSession: SESSION_MINUTES,
  barCount: sessions.reduce((count, bars) => count + bars.length, 0),
  readMinutes: Object.freeze(sessions.map((bars, day) => buildRound(bars, day).readMinute)),
  calendar: 'Five simulated 22:00–21:00 UTC sessions, Sunday evening through Friday, with a 21:00–22:00 UTC daily pause.',
});
export const rounds = sessions.map((bars, day) => buildRound(bars, day));
