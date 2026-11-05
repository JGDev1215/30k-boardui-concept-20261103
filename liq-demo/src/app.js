import { createPriceChart } from './chart.js?v=liq30';
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

const priceChart = createPriceChart(el.chart, { readout: byId('chart-readout'), boundary: byId('chart-boundary') });
byId('chart-reset').addEventListener('click', () => priceChart.resetView());
byId('chart-zoom-in').addEventListener('click', () => priceChart.zoom(.7));
byId('chart-zoom-out').addEventListener('click', () => priceChart.zoom(1.4));

function chart(bars, revealed = false, eventTime = null) {
  document.querySelector('.snapshot-card .card-state').textContent = revealed ? 'AFTER' : 'BEFORE';
  if (!bars.length) { priceChart.clear(); return; }
  priceChart.show({ snapshot: round.snapshot, levels: round.eligibleLevels,
    ...(revealed ? { bars, eventTime } : {}), selectedId: el.target.value });
}

function showOpponents() {
  if (!round) return;
  priceChart.select(el.target.value);
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
  setView('checkpoint');
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
