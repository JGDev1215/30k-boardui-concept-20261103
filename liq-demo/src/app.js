import { prepareRound, scoreRound } from './engine.js';
import { rounds, weekSummary } from './rounds.js?v=liq28';

// This public demo only simulates a lock in the interface. Its fixture module
// contains both sides of each invented round and can be inspected at any time.
const byId = (id) => document.getElementById(id);
const londonTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const el = {
  load: byId('load-checkpoint'),
  metadata: byId('metadata'), chart: byId('chart'),
  eligible: byId('eligible-list'), context: byId('context-list'),
  target: byId('target'), rationale: byId('rationale'), opponents: byId('opponents'),
  lock: byId('lock'), reveal: byId('reveal'), pass: byId('pass'), reset: byId('reset'),
  locked: byId('locked'), result: byId('result'), phase: byId('phase-status'),
  stages: [byId('stage-snapshot'), byId('stage-choice'), byId('stage-reveal')],
  checkpointDate: byId('checkpoint-date'), checkpointPrice: byId('checkpoint-price'), startAvailability: byId('start-availability'),
  startCoverage: byId('start-coverage'), statusMeta: byId('status-meta'),
  statusCoverage: byId('status-coverage'), statusIdentity: byId('status-identity'),
  statusInventory: byId('status-inventory'), statusReason: byId('status-reason'),
};

let round = null;
let selectedFixture = null;
let lock = null;
let nextIndex = 0;

function setView(name) {
  if (name === 'checkpoint' && !round) name = 'start';
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== `view-${name}`;
  for (const button of document.querySelectorAll('.side-nav [data-view]')) {
    if (button.dataset.view === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
}

function setStage(index, message) {
  el.phase.textContent = message;
  el.stages.forEach((stage, position) => {
    stage.dataset.state = position < index ? 'done' : position === index ? 'current' : 'locked';
    if (position === index) stage.setAttribute('aria-current', 'step');
    else stage.removeAttribute('aria-current');
  });
}

function result(status, message) {
  el.result.className = `result ${status}`;
  el.result.replaceChildren();
  const label = document.createElement('strong');
  label.textContent = status;
  const detail = document.createElement('span');
  detail.textContent = message;
  el.result.append(label, detail);
}

function svgNode(tag, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function chart(bars, revealed = false, eventTime = null) {
  const svg = el.chart;
  document.querySelector('.snapshot-card .card-state').textContent = revealed ? 'AFTER' : 'BEFORE';
  document.querySelector('.snapshot-card .eyebrow').textContent = revealed ? 'Made-up prices · after choice' : 'Made-up prices · before choice';
  document.querySelector('.chart-scroll-hint').textContent = revealed
    ? 'Swipe sideways. The dotted line marks where the round began.'
    : 'Swipe sideways for detail.';
  svg.replaceChildren();
  if (!bars.length) {
    svg.style.width = '900px';
    svg.setAttribute('viewBox', '0 0 900 320');
    const message = svgNode('text', { x: 30, y: 160, fill: '#a9bdd1', 'font-size': 17 });
    message.textContent = 'Choose a sample to see prices.';
    svg.append(message);
    svg.setAttribute('aria-label', message.textContent);
    return;
  }
  const fullCount = bars.length;
  let visiblePrefix = 0;
  if (revealed) {
    const later = bars.slice(round.snapshot.bars.length);
    const eventIndex = later.findIndex((bar) => bar.time === eventTime);
    const laterCount = eventIndex < 0 ? later.length : Math.min(later.length, Math.max(90, eventIndex + 25));
    const prefix = round.snapshot.bars.slice(-45);
    visiblePrefix = prefix.length;
    bars = [...prefix, ...later.slice(0, laterCount)];
  } else {
    // The whole known morning is inspectable by swiping; begin at the latest bars.
    bars = [...bars];
  }
  const width = Math.max(900, bars.length * 8 + 100);
  svg.style.width = `${width}px`;
  svg.setAttribute('viewBox', `0 0 ${width} 320`);
  const values = bars.flatMap((bar) => [bar.high, bar.low]);
  let min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max((max - min) * .12, .5);
  min -= pad; max += pad;
  const left = 64, right = width - 70, top = 22, bottom = 280;
  const x = (index) => left + index * (right - left) / Math.max(bars.length - 1, 1);
  const y = (price) => bottom - (price - min) * (bottom - top) / (max - min);
  for (let step = 0; step <= 4; step++) {
    const price = min + step * (max - min) / 4;
    const axis = y(price);
    svg.append(svgNode('line', { x1: left, x2: right, y1: axis, y2: axis, stroke: '#22394c' }));
    const label = svgNode('text', { x: 4, y: axis + 4, fill: '#8faabd', 'font-size': 11 });
    label.textContent = price.toFixed(2);
    svg.append(label);
  }
  bars.forEach((bar, index) => {
    const color = bar.close >= bar.open ? '#75d7c0' : '#e79b9f';
    svg.append(svgNode('line', { x1: x(index), x2: x(index), y1: y(bar.high), y2: y(bar.low), stroke: color, 'stroke-width': 2 }));
    svg.append(svgNode('rect', {
      x: x(index) - 6, y: Math.min(y(bar.open), y(bar.close)), width: 12,
      height: Math.max(2, Math.abs(y(bar.open) - y(bar.close))), fill: color,
    }));
  });
  if (revealed) {
    const readIndex = visiblePrefix - 1;
    const divider = (x(readIndex) + x(readIndex + 1)) / 2;
    svg.append(svgNode('line', { x1: divider, x2: divider, y1: top, y2: bottom, stroke: '#e6bd68', 'stroke-width': 2, 'stroke-dasharray': '6 5' }));
  }
  for (const [position, stamp, anchor] of [[left, bars[0].time, 'start'], [right, bars.at(-1).time, 'end']]) {
    const label = svgNode('text', { x: position, y: 311, fill: '#a9bdd1', 'font-size': 11, 'text-anchor': anchor });
    label.textContent = `${londonTime.format(Date.parse(stamp))} London`;
    svg.append(label);
  }
  svg.setAttribute('aria-label', `${revealed ? 'Revealed' : 'Before-choice'} made-up chart showing ${bars.length} of ${fullCount} available minute bars.`);
  svg.parentElement.scrollLeft = revealed ? 0 : svg.parentElement.scrollWidth;
}

function showOpponents() {
  if (!round) return;
  for (const button of el.eligible.querySelectorAll('button[data-target-id]')) {
    button.setAttribute('aria-pressed', String(button.dataset.targetId === el.target.value));
  }
  const target = round.eligibleLevels.find((level) => level.id === el.target.value);
  if (!target) {
    el.opponents.textContent = 'Tap a target above.';
    if (!lock) el.lock.disabled = true;
    return;
  }
  const opponents = round.eligibleLevels.filter((level) => level.side !== target.side);
  if (!lock) el.lock.disabled = false;
  el.opponents.textContent = opponents.length
    ? opponents.map((level) => `${level.label} ${level.trigger.toFixed(2)}`).join(' · ')
    : 'No target on the other side.';
}

function reset() {
  round = null;
  selectedFixture = null;
  lock = null;
  el.target.replaceChildren(new Option('Tap a target', ''));
  el.target.disabled = true;
  el.rationale.value = '';
  el.rationale.disabled = true;
  el.lock.disabled = true;
  el.lock.hidden = false;
  el.reveal.disabled = true;
  el.reveal.hidden = true;
  el.pass.disabled = true;
  el.pass.hidden = false;
  el.locked.textContent = '';
  el.opponents.textContent = 'Press Play first.';
  el.eligible.replaceChildren();
  el.context.replaceChildren();
  el.metadata.textContent = 'Press Play to see sample details.';
  el.checkpointDate.textContent = 'Scenario';
  el.checkpointPrice.textContent = 'Latest close —';
  el.startAvailability.textContent = 'Ready';
  el.startCoverage.textContent = '';
  el.statusMeta.textContent = 'No scenario open.';
  el.statusCoverage.textContent = '—';
  el.statusIdentity.textContent = 'Invented';
  el.statusInventory.textContent = 'Demo only';
  el.statusReason.textContent = 'The public page cannot hide future data.';
  chart([]);
  result('READY', 'Press Play to begin.');
  setStage(0, 'Ready to play');
}

function openScenario() {
  reset();
  selectedFixture = rounds[nextIndex];
  nextIndex = (nextIndex + 1) % rounds.length;
  if (!selectedFixture) { result('UNAVAILABLE', 'No sample scenario is available.'); return; }
  try { round = prepareRound(selectedFixture.snapshot); }
  catch (error) { result('UNAVAILABLE', `Invented fixture error: ${error.message}`); return; }
  el.target.replaceChildren(new Option('Tap a target', ''));
  for (const level of round.eligibleLevels) {
    el.target.add(new Option(`${level.label} · ${level.side} · ${level.trigger.toFixed(2)}`, level.id));
    const row = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.targetId = level.id;
    button.textContent = `${level.label} · ${level.side} · ${level.trigger.toFixed(2)}`;
    row.append(button);
    el.eligible.append(row);
  }
  for (const level of round.contextLevels) {
    const row = document.createElement('li');
    row.textContent = `${level.label} · context only`;
    el.context.append(row);
  }
  el.target.disabled = false;
  el.rationale.disabled = false;
  el.lock.disabled = true;
  el.pass.disabled = false;
  el.startAvailability.textContent = `${selectedFixture.label} ready at 06:46 London`;
  el.startCoverage.textContent = `${round.eligibleLevels.length} targets`;
  el.checkpointDate.textContent = selectedFixture.label;
  el.checkpointPrice.textContent = `Latest close ${round.snapshotPrice.toFixed(2)}`;
  el.metadata.textContent = `${selectedFixture.label}: ${round.snapshot.bars.length} complete one-minute bars before 06:46 London and ${selectedFixture.continuation.bars.length} later bars through the simulated session close. The full earlier chart can be swiped. These prices are invented; the demo-only outcome window ends with this session.`;
  el.statusMeta.textContent = `${selectedFixture.label} · 06:46 London read ${round.snapshot.read_at} · demo end ${round.snapshot.end_at}`;
  el.statusCoverage.textContent = `${round.snapshot.bars.length} before + ${selectedFixture.continuation.bars.length} after · ${weekSummary.barCount} in the week`;
  el.statusIdentity.textContent = 'Synthetic';
  el.statusInventory.textContent = `${round.eligibleLevels.length} invented draws`;
  el.statusReason.textContent = 'The public page includes the future path.';
  chart(round.snapshot.bars);
  showOpponents();
  result('READY', 'Pick a target to begin.');
  setStage(1, 'Tap a target');
  setView('checkpoint');
}

function lockChoice() {
  if (!round || lock) return;
  const target = round.eligibleLevels.find((level) => level.id === el.target.value);
  if (!target) return;
  lock = Object.freeze({
    targetId: target.id,
    opponentIds: Object.freeze(round.eligibleLevels.filter((level) => level.side !== target.side).map((level) => level.id)),
    rationale: el.rationale.value,
    lockedAt: new Date().toISOString(),
  });
  el.target.disabled = true;
  for (const button of el.eligible.querySelectorAll('button')) button.disabled = true;
  el.rationale.disabled = true;
  el.lock.disabled = true;
  el.pass.disabled = true;
  el.lock.hidden = true;
  el.pass.hidden = true;
  el.reveal.disabled = false;
  el.reveal.hidden = false;
  el.locked.textContent = `Locked: ${target.label}. Now reveal the result.`;
  showOpponents();
  setStage(2, 'Choice locked · reveal next');
}

function reveal() {
  if (!round || !lock || !selectedFixture) return;
  const outcome = scoreRound(round, lock.targetId, selectedFixture.continuation);
  const label = ['ORDER_UNKNOWN', 'TIMEOUT'].includes(outcome.status) ? 'UNRESOLVED' : outcome.status;
  const time = outcome.eventTime ? `${londonTime.format(Date.parse(outcome.eventTime))} London` : '';
  const firstOpponent = round.eligibleLevels.find((level) => level.id === outcome.opponentIds[0]);
  const message = label === 'WIN' ? `Your target was reached before the other side at ${time}.`
    : label === 'LOSS' ? `The other side was reached first: ${firstOpponent?.label ?? 'opposing target'} at ${time}.`
      : outcome.status === 'ORDER_UNKNOWN' ? `Both sides were touched in the same minute (${time}); we cannot tell which was first.`
        : outcome.status === 'TIMEOUT' ? 'Neither side was reached before this simulated session ended; unresolved.'
          : label === 'UNOPPOSED' ? 'There was no target on the other side to compare.'
            : 'This sample cannot be scored.';
  result(label, message);
  chart([...round.snapshot.bars, ...selectedFixture.continuation.bars], true, outcome.eventTime);
  const chosen = round.eligibleLevels.find((level) => level.id === lock.targetId);
  el.locked.textContent = `Your choice: ${chosen?.label ?? 'target'}.`;
  el.reveal.disabled = true;
  el.reveal.hidden = true;
  el.statusReason.textContent = `${label} in a made-up example.`;
  setStage(2, `Result: ${label}`);
}

function pass() {
  if (!round || lock) return;
  openScenario();
}

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => setView(button.dataset.view));
}
el.load.addEventListener('click', openScenario);
el.target.addEventListener('change', showOpponents);
el.eligible.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-target-id]');
  if (!button || !round || lock || el.target.disabled) return;
  el.target.value = button.dataset.targetId;
  showOpponents();
});
el.lock.addEventListener('click', lockChoice);
el.reveal.addEventListener('click', reveal);
el.pass.addEventListener('click', pass);
el.reset.addEventListener('click', openScenario);
reset();
setView('start');
