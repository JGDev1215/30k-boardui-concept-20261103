// LIQ prototype v1. These are provisional game mechanics, not market validation.

const MINUTE = 60_000;
const STATUS = Object.freeze({
  WIN: 'WIN',
  LOSS: 'LOSS',
  ORDER_UNKNOWN: 'ORDER_UNKNOWN',
  TIMEOUT: 'TIMEOUT',
  UNOPPOSED: 'UNOPPOSED',
  UNAVAILABLE: 'UNAVAILABLE',
});

function fail(message) {
  throw new Error(message);
}

function textField(value, name) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${name} must be a nonempty string`);
  return value;
}

function instant(value, name, minuteAligned = false) {
  const match = typeof value === 'string'
    ? value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/)
    : null;
  if (!match) {
    fail(`${name} must be a UTC ISO timestamp ending in Z`);
  }
  const time = Date.parse(value);
  const parsed = new Date(time);
  const fields = [
    parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, parsed.getUTCDate(),
    parsed.getUTCHours(), parsed.getUTCMinutes(), parsed.getUTCSeconds(),
  ];
  const stated = match.slice(1, 7).map(Number);
  if (!Number.isFinite(time) || fields.some((field, index) => field !== stated[index])
    || (minuteAligned && time % MINUTE !== 0)) {
    fail(`${name} must be a valid${minuteAligned ? ' minute-aligned' : ''} UTC instant`);
  }
  return time;
}

function numberField(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${name} must be a finite number`);
  return value;
}

function onlyFields(value, allowed, name) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`${name} has unrecognized field ${key}`);
  }
}

function validateBars(bars, name, { min, max, last } = {}) {
  if (!Array.isArray(bars)) fail(`${name} must be an array`);
  let previous = -Infinity;
  const times = [];
  bars.forEach((bar, index) => {
    if (!bar || typeof bar !== 'object' || Array.isArray(bar)) fail(`${name}[${index}] must be a bar`);
    onlyFields(bar, ['time', 'open', 'high', 'low', 'close'], `${name}[${index}]`);
    const at = instant(bar.time, `${name}[${index}].time`, true);
    if (at <= previous) fail(`${name} must have strictly increasing minute times`);
    if ((min !== undefined && at < min) || (max !== undefined && at >= max)) {
      fail(`${name}[${index}] is outside the declared interval`);
    }
    const open = numberField(bar.open, `${name}[${index}].open`);
    const high = numberField(bar.high, `${name}[${index}].high`);
    const low = numberField(bar.low, `${name}[${index}].low`);
    const close = numberField(bar.close, `${name}[${index}].close`);
    if (low > high || high < Math.max(open, close) || low > Math.min(open, close)) {
      fail(`${name}[${index}] has inconsistent OHLC prices`);
    }
    previous = at;
    times.push(at);
  });
  if (last !== undefined && (times.length === 0 || times.at(-1) !== last)) {
    fail(`${name} must end with the last minute closed at the read`);
  }
  return times;
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function isOnSide(level, price) {
  return level.side === 'BUY' ? level.trigger > price : level.trigger < price;
}

function hit(bar, level) {
  return level.side === 'BUY' ? bar.high >= level.trigger : bar.low <= level.trigger;
}

function result(status, reason, targetId, eventTime = null, opponentIds = []) {
  return { status, reason, targetId, eventTime, opponentIds };
}

export function prepareRound(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('snapshot must be an object');
  // Copy before validation/freeze: callers cannot change a locked inventory through their input.
  const snapshot = JSON.parse(JSON.stringify(input));
  onlyFields(snapshot, [
    'schema_version', 'round_id', 'instrument', 'series', 'source',
    'read_at', 'end_at', 'inventory_complete', 'bars', 'levels', 'fixture_notice',
  ], 'snapshot');
  if (Object.hasOwn(snapshot, 'fixture_notice')) {
    if (typeof snapshot.fixture_notice !== 'string' || !/synthetic/i.test(snapshot.fixture_notice)) {
      fail('fixture_notice must visibly identify synthetic values');
    }
  }
  if (snapshot.schema_version !== 1) fail('unsupported snapshot schema_version');
  for (const field of ['round_id', 'instrument', 'series', 'source']) textField(snapshot[field], field);
  if (snapshot.inventory_complete !== true) fail('inventory_complete must be true for a scored round');
  const read = instant(snapshot.read_at, 'read_at', true);
  const end = instant(snapshot.end_at, 'end_at', true);
  if (end <= read) fail('end_at must be later than read_at');
  validateBars(snapshot.bars, 'snapshot.bars', { max: read, last: read - MINUTE });
  const snapshotPrice = snapshot.bars.at(-1).close;

  if (!Array.isArray(snapshot.levels)) fail('levels must be an array');
  const ids = new Set();
  const eligibleLevels = [];
  const contextLevels = [];
  snapshot.levels.forEach((level, index) => {
    const prefix = `levels[${index}]`;
    if (!level || typeof level !== 'object' || Array.isArray(level)) fail(`${prefix} must be a level`);
    onlyFields(level, level.kind === 'GAP'
      ? ['id', 'label', 'kind', 'side', 'trigger', 'known_at', 'formed_at', 'prior_touch', 'near_edge', 'far_edge', 'live_as_of']
      : ['id', 'label', 'kind', 'side', 'trigger', 'known_at', 'formed_at', 'prior_touch'], prefix);
    textField(level.id, `${prefix}.id`);
    textField(level.label, `${prefix}.label`);
    if (ids.has(level.id)) fail(`duplicate level id: ${level.id}`);
    ids.add(level.id);
    if (!['POOL', 'GAP', 'REFERENCE'].includes(level.kind)) fail(`${prefix}.kind is invalid`);
    if (!['BUY', 'SELL'].includes(level.side)) fail(`${prefix}.side is invalid`);
    if (!['NONE', 'TOUCHED', 'UNKNOWN'].includes(level.prior_touch)) fail(`${prefix}.prior_touch is invalid`);
    numberField(level.trigger, `${prefix}.trigger`);
    const formed = instant(level.formed_at, `${prefix}.formed_at`);
    const known = instant(level.known_at, `${prefix}.known_at`);
    if (formed > known || known > read) fail(`${prefix} was not known by the read`);

    if (level.kind === 'GAP') {
      numberField(level.near_edge, `${prefix}.near_edge`);
      numberField(level.far_edge, `${prefix}.far_edge`);
      if (level.trigger !== level.near_edge || level.far_edge === level.near_edge) {
        fail(`${prefix} has invalid gap edges or trigger`);
      }
      if (typeof level.live_as_of !== 'boolean') fail(`${prefix}.live_as_of must be boolean`);
      if (level.side === 'BUY' ? level.far_edge < level.near_edge : level.far_edge > level.near_edge) {
        fail(`${prefix} gap edges conflict with side`);
      }
    }

    const possibleCandidate = level.kind === 'POOL' || (level.kind === 'GAP' && level.live_as_of);
    if (possibleCandidate && level.prior_touch === 'UNKNOWN') {
      fail(`${prefix} has unknown prior-touch status; opponent set cannot be trusted`);
    }
    if (possibleCandidate && level.prior_touch === 'NONE' && isOnSide(level, snapshotPrice)) {
      eligibleLevels.push(level);
    } else {
      contextLevels.push(level);
    }
  });

  return freezeDeep({ snapshot, eligibleLevels, contextLevels, snapshotPrice, read, end });
}

export function scoreRound(round, targetId, continuation) {
  if (!round || !Array.isArray(round.eligibleLevels) || !round.snapshot) fail('round must come from prepareRound');
  const target = round.eligibleLevels.find((level) => level.id === targetId);
  if (!target) fail(`target ${String(targetId)} is not eligible at the checkpoint`);
  const opponents = round.eligibleLevels.filter((level) => level.side !== target.side);
  const opponentIds = opponents.map((level) => level.id);

  try {
    if (!continuation || typeof continuation !== 'object' || Array.isArray(continuation)) {
      fail('continuation must be an object');
    }
    if (continuation.schema_version !== 1) fail('unsupported continuation schema_version');
    for (const field of ['round_id', 'instrument', 'series', 'source']) {
      if (continuation[field] !== round.snapshot[field]) fail(`continuation ${field} does not match snapshot`);
    }
    validateBars(continuation.bars, 'continuation.bars', { min: round.read, max: round.end });
  } catch (error) {
    return result(STATUS.UNAVAILABLE, error.message, target.id);
  }

  // A missing minute before a result can conceal the true first touch.
  let expected = round.read;
  for (const bar of continuation.bars) {
    const at = Date.parse(bar.time);
    if (at !== expected) {
      return result(STATUS.UNAVAILABLE, `missing minute before ${bar.time}`, target.id);
    }
    if (opponents.length > 0) {
      const targetHit = hit(bar, target);
      const touchedOpponents = opponents.filter((level) => hit(bar, level)).map((level) => level.id);
      if (targetHit && touchedOpponents.length > 0) {
        return result(STATUS.ORDER_UNKNOWN, 'target and opposing draw both reached in one OHLC minute; intrabar order is unknown', target.id, bar.time, touchedOpponents);
      }
      if (targetHit) return result(STATUS.WIN, 'chosen target reached before every frozen opposing draw', target.id, bar.time);
      if (touchedOpponents.length > 0) {
        return result(STATUS.LOSS, 'an opposing draw reached before the chosen target', target.id, bar.time, touchedOpponents);
      }
    }
    expected += MINUTE;
  }
  if (expected < round.end) {
    return result(STATUS.UNAVAILABLE, 'continuation is missing minutes before the declared end', target.id);
  }
  if (opponents.length === 0) {
    return result(STATUS.UNOPPOSED, 'no eligible opposing draw was frozen at the checkpoint', target.id);
  }
  return result(STATUS.TIMEOUT, 'neither chosen target nor opposing draw reached before the declared end', target.id);
}

export { STATUS };
