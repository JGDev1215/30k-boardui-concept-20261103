import { createChart, CandlestickSeries, ColorType, LineStyle, createSeriesMarkers } from '../vendor/lightweight-charts-5.2.1.standalone.production.mjs';
import { chartData, initialRange, londonLabel, londonDetail } from './chart-data.js';

export function createPriceChart(container, { readout, boundary }) {
  let model = null;
  let selectedId = null;
  let lines = [];
  let needsFit = false;
  const chart = createChart(container, {
    width: Math.max(1, container.clientWidth), height: Math.max(1, container.clientHeight),
    layout: { background: { type: ColorType.Solid, color: '#0c1821' }, textColor: '#c9d5df', fontSize: 12, attributionLogo: true },
    grid: { vertLines: { color: '#172733' }, horzLines: { color: '#20323f' } },
    rightPriceScale: { borderColor: '#38505f', minimumWidth: 76 },
    timeScale: { borderColor: '#38505f', timeVisible: true, secondsVisible: false,
      tickMarkFormatter: (time) => typeof time === 'number' ? londonLabel(time) : '' },
    localization: { locale: 'en-GB', timeFormatter: (time) => typeof time === 'number' ? `${londonDetail(time)} · London` : '' },
    handleScroll: { horzTouchDrag: true, vertTouchDrag: false, pressedMouseMove: true, mouseWheel: true },
    handleScale: { pinch: true, mouseWheel: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
  });
  const series = chart.addSeries(CandlestickSeries, {
    upColor: '#4ac5a1', downColor: '#ee7b84', borderVisible: false,
    wickUpColor: '#4ac5a1', wickDownColor: '#ee7b84',
    priceFormat: { type: 'price', precision: 2, minMove: .25 },
    lastValueVisible: true, priceLineVisible: false,
    autoscaleInfoProvider: (base) => {
      const info = base();
      if (!info || !model?.targets.length) return info;
      return { ...info, priceRange: {
        minValue: Math.min(info.priceRange.minValue, ...model.targets.map((target) => target.trigger)),
        maxValue: Math.max(info.priceRange.maxValue, ...model.targets.map((target) => target.trigger)),
      } };
    },
  });
  const markers = createSeriesMarkers(series, []);
  let candleMap = new Map();

  function describeCandle(bar) {
    readout.textContent = bar ? `${londonDetail(bar.time)} · O ${bar.open.toFixed(2)} H ${bar.high.toFixed(2)} L ${bar.low.toFixed(2)} C ${bar.close.toFixed(2)}`
      : 'Open a scenario to see prices.';
  }

  function positionBoundary() {
    if (!model) { boundary.hidden = true; return; }
    const at = chart.timeScale().timeToCoordinate(model.read);
    const previous = chart.timeScale().timeToCoordinate(model.read - 60);
    const x = at === null || previous === null ? null : (at + previous) / 2;
    const plotWidth = chart.timeScale().width();
    boundary.hidden = x === null || x < 0 || x > plotWidth;
    if (!boundary.hidden) boundary.style.left = `${x}px`;
  }

  function resetView() {
    if (!model?.candles.length || !container.clientWidth) { needsFit = true; return; }
    chart.timeScale().setVisibleLogicalRange(initialRange(model));
    chart.priceScale('right').applyOptions({ autoScale: true });
    positionBoundary();
    needsFit = false;
  }

  function updateLines() {
    for (const line of lines) series.removePriceLine(line);
    lines = (model?.targets ?? []).map((target) => series.createPriceLine({
      price: target.trigger,
      color: target.id === selectedId ? '#ffda83' : target.side === 'BUY' ? '#8fceee' : '#d9a5d8',
      lineWidth: target.id === selectedId ? 2 : 1,
      lineStyle: target.id === selectedId ? LineStyle.Solid : LineStyle.Dashed,
      axisLabelVisible: true,
      title: `${target.id === selectedId ? 'Chosen ' : ''}${target.side === 'BUY' ? 'High' : 'Low'}`,
    }));
  }

  function show(input) {
    model = chartData(input);
    selectedId = input.selectedId ?? null;
    candleMap = new Map(model.candles.map((bar) => [bar.time, bar]));
    series.setData(model.data);
    updateLines();
    markers.setMarkers(model.event === null ? [] : [{ time: model.event, position: 'aboveBar', color: '#ffda83', shape: 'circle', text: 'Result' }]);
    container.setAttribute('aria-label', `${model.revealed ? 'Revealed' : 'Before choice'} synthetic one-minute chart. ${model.candles.length} candles. Times are London.`);
    container.dataset.barCount = String(model.candles.length);
    container.dataset.lastBar = String(model.candles.at(-1)?.time ?? '');
    describeCandle(candleMap.get(model.event) ?? model.candles.at(-1));
    resetView();
  }

  chart.subscribeCrosshairMove((param) => {
    describeCandle(candleMap.get(param.time) ?? candleMap.get(model?.event) ?? model?.candles.at(-1));
  });
  chart.timeScale().subscribeVisibleLogicalRangeChange(positionBoundary);
  const observer = new ResizeObserver(() => {
    if (!container.clientWidth || !container.clientHeight) return;
    chart.resize(container.clientWidth, container.clientHeight);
    if (needsFit) resetView();
    else positionBoundary();
  });
  observer.observe(container);

  return {
    show, resetView,
    select(id) { selectedId = id; updateLines(); },
    zoom(factor) {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (!range) return;
      const middle = (range.from + range.to) / 2;
      const half = Math.max(5, (range.to - range.from) * factor / 2);
      chart.timeScale().setVisibleLogicalRange({ from: middle - half, to: middle + half });
    },
    clear() {
      model = null; selectedId = null; candleMap.clear(); series.setData([]); markers.setMarkers([]); updateLines();
      boundary.hidden = true; readout.textContent = 'Open a scenario to see prices.';
      container.dataset.barCount = '0'; container.dataset.lastBar = '';
    },
    destroy() { observer.disconnect(); chart.remove(); },
  };
}
