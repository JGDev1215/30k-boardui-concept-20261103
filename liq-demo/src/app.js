import { prepareRound, scoreRound } from './engine.js';
import { rounds } from './rounds.js';

// This public demo only simulates a lock in the interface. Its fixture module
// contains both sides of each invented round and can be inspected at any time.
const byId = (id) => document.getElementById(id);
const el = {
  date: byId('analysis-date'), load: byId('load-checkpoint'),
  metadata: byId('metadata'), chart: byId('chart'),
  eligible: byId('eligible-list'), context: byId('context-list'),
  target: byId('target'), rationale: byId('rationale'), opponents: byId('opponents'),
  lock: byId('lock'), reveal: byId('reveal'), pass: byId('pass'), reset: byId('reset'),
  locked: byId('locked'), result: byId('result'), phase: byId('phase-status'),
  stages: [byId('stage-snapshot'), byId('stage-choice'), byId('stage-reveal')],
  checkpointDate: byId('checkpoint-date'), startAvailability: byId('start-availability'),
  startCoverage: byId('start-coverage'), statusMeta: byId('status-meta'),
  statusCoverage: byId('status-coverage'), statusIdentity: byId('status-identity'),
  statusInventory: byId('status-inventory'), statusReason: byId('status-reason'),
};

let round = null;
let selectedFixture = null;
let lock = null;

function setView(name) {
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

function chart(bars, revealed = false) {
  const svg = el.chart;
  document.querySelector('.snapshot-card .card-state').textContent = revealed ? 'AFTER' : 'BEFORE';
  document.querySelector('.snapshot-card .eyebrow').textContent = revealed ? 'Made-up prices · full path' : 'Made-up prices · before choice';
  document.querySelector('.chart-scroll-hint').textContent = revealed
    ? 'Swipe sideways. The dotted line marks where the round began.'
    : 'Swipe sideways for detail.';
  svg.replaceChildren();
  svg.setAttribute('viewBox', '0 0 900 320');
  if (!bars.length) {
    const message = svgNode('text', { x: 30, y: 160, fill: '#a9bdd1', 'font-size': 17 });
    message.textContent = 'Choose a sample to see prices.';
    svg.append(message);
    svg.setAttribute('aria-label', message.textContent);
    return;
  }
  const values = bars.flatMap((bar) => [bar.high, bar.low]);
  let min = Math.min(...values), max = Math.max(...values);
  const pad = Math.max((max - min) * .12, .5);
  min -= pad; max += pad;
  const left = 64, right = 830, top = 22, bottom = 280;
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
    const readIndex = round.snapshot.bars.length - 1;
    const divider = (x(readIndex) + x(readIndex + 1)) / 2;
    svg.append(svgNode('line', { x1: divider, x2: divider, y1: top, y2: bottom, stroke: '#e6bd68', 'stroke-width': 2, 'stroke-dasharray': '6 5' }));
  }
  for (const [position, stamp, anchor] of [[left, bars[0].time, 'start'], [right, bars.at(-1).time, 'end']]) {
    const label = svgNode('text', { x: position, y: 311, fill: '#a9bdd1', 'font-size': 11, 'text-anchor': anchor });
    label.textContent = `${stamp.slice(11, 16)} UTC`;
    svg.append(label);
  }
  svg.setAttribute('aria-label', `${revealed ? 'Full' : 'Before-choice'} made-up chart with ${bars.length} minute bars.`);
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
  el.opponents.textContent = 'Choose a sample first.';
  el.eligible.replaceChildren();
  el.context.replaceChildren();
  el.metadata.textContent = 'Choose a sample to see details.';
  el.checkpointDate.textContent = 'Sample round';
  el.startAvailability.textContent = 'Ready';
  el.startCoverage.textContent = '';
  el.statusMeta.textContent = 'No sample open.';
  el.statusCoverage.textContent = '—';
  el.statusIdentity.textContent = 'Invented';
  el.statusInventory.textContent = 'Demo only';
  el.statusReason.textContent = 'The public page cannot hide future data.';
  chart([]);
  result('UNAVAILABLE', 'Choose a sample to begin.');
  setStage(0, 'Choose a sample');
}

function openScenario() {
  reset();
  selectedFixture = rounds.find((entry) => entry.id === el.date.value);
  if (!selectedFixture) return;
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
  el.startAvailability.textContent = `${selectedFixture.label} ready`;
  el.startCoverage.textContent = `${round.eligibleLevels.length} targets`;
  el.checkpointDate.textContent = selectedFixture.label;
  el.metadata.textContent = `${round.snapshot.round_id} · invented minute prices · read ${round.snapshot.read_at} · end ${round.snapshot.end_at} · ${round.eligibleLevels.length} targets. No real market prices.`;
  el.statusMeta.textContent = `${selectedFixture.label} · read ${round.snapshot.read_at} · end ${round.snapshot.end_at}`;
  el.statusCoverage.textContent = `${round.snapshot.bars.length} invented bars`;
  el.statusIdentity.textContent = 'Synthetic';
  el.statusInventory.textContent = `${round.eligibleLevels.length} invented draws`;
  el.statusReason.textContent = 'The public page includes the future path.';
  chart(round.snapshot.bars);
  showOpponents();
  result('UNAVAILABLE', 'Pick a target to begin.');
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
  const label = outcome.status === 'ORDER_UNKNOWN' ? 'UNRESOLVED' : outcome.status;
  const time = outcome.eventTime ? `${outcome.eventTime.slice(11, 16)} UTC` : '';
  const firstOpponent = round.eligibleLevels.find((level) => level.id === outcome.opponentIds[0]);
  const message = label === 'WIN' ? `Your target was reached before the other side at ${time}.`
    : label === 'LOSS' ? `The other side was reached first: ${firstOpponent?.label ?? 'opposing target'} at ${time}.`
      : label === 'UNRESOLVED' ? `Both sides were touched in the same minute (${time}); we cannot tell which was first.`
        : label === 'TIMEOUT' ? 'Neither side was reached before this sample ended.'
          : label === 'UNOPPOSED' ? 'There was no target on the other side to compare.'
            : 'This sample cannot be scored.';
  result(label, message);
  chart([...round.snapshot.bars, ...selectedFixture.continuation.bars], true);
  const chosen = round.eligibleLevels.find((level) => level.id === lock.targetId);
  el.locked.textContent = `Your choice: ${chosen?.label ?? 'target'}.`;
  el.reveal.disabled = true;
  el.reveal.hidden = true;
  el.statusReason.textContent = `${label} in a made-up example.`;
  setStage(2, `Result: ${label}`);
}

function pass() {
  if (!round || lock) return;
  result('PASS', 'Skipped this sample. Tap New round to try again.');
  el.target.disabled = true;
  for (const button of el.eligible.querySelectorAll('button')) button.disabled = true;
  el.rationale.disabled = true;
  el.lock.disabled = true;
  el.pass.disabled = true;
  el.lock.hidden = true;
  el.pass.hidden = true;
  setStage(1, 'Skipped');
}

for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => setView(button.dataset.view));
}
el.load.addEventListener('click', openScenario);
// On a phone the native picker may cover the separate Open button. A completed
// selection immediately opens that invented round; Open still opens the default.
el.date.addEventListener('change', openScenario);
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
el.reset.addEventListener('click', () => { reset(); setView('start'); });
reset();
setView('start');
