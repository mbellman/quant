import { fetchEnhancedSymbolData, fetchRandomDay } from './api';
import { plotData, plotDailyComposite, plotPartialDay } from './render';
import { IntervalType, SymbolData, EnhancedSymbolData, Interval } from '../types';
import { linkIntervals } from './utilities';
import { getHeikinAshiIntervals } from './technicals/heikin-ashi';
import { getVolumeWeightedAveragePrice } from './technicals/vwap';

enum DayTradingMode {
  CALL,
  PUT
}

interface DayTradingPracticeState {
  intervals: Interval[];
  step: number;
  startingPrice: number;
  deltas: number[];
  timer: number;
  mode: DayTradingMode;
  isActive: boolean;
  isHolding: boolean;
}

interface State {
  data: EnhancedSymbolData;
  mouseX: number;
  mouseY: number;
  leftCutoff: number;
  rightCutoff: number;
  wheelMomentum: number;
  dragMomentum: number;
  isViewingHistory: boolean;
  practice: DayTradingPracticeState;
}

const state: State = {
  data: {} as EnhancedSymbolData,
  mouseX: 0,
  mouseY: 0,
  leftCutoff: 0,
  rightCutoff: 0,
  wheelMomentum: 0,
  dragMomentum: 0,
  isViewingHistory: true,
  practice: {
    intervals: [],
    step: 0,
    startingPrice: 0,
    deltas: [0],
    timer: null,
    mode: DayTradingMode.CALL,
    isActive: false,
    isHolding: false,
  }
};

function element<T extends HTMLElement>(selector: string): T {
  return document.querySelector(selector);
}

async function load<T>(loadable: () => Promise<T>): Promise<T> {
  element('.loader-overlay').style.display = 'block';

  const data = await loadable();

  element('.loader-overlay').style.display = 'none';

  return data;
}

function loadEnhancedSymbolData(symbol: string, type: IntervalType): Promise<EnhancedSymbolData> {
  return load(() => fetchEnhancedSymbolData(symbol, type));
}

function loadRandomDay(): Promise<SymbolData> {
  return load(() => fetchRandomDay());
}

async function showEnhancedSymbolData(symbol: string, type: IntervalType): Promise<void> {
  element<HTMLInputElement>('#symbol').value = symbol;

  const data = await loadEnhancedSymbolData(symbol, type);

  linkIntervals(data.intervals);

  state.data = data;
  state.leftCutoff = 0;
  state.rightCutoff = 0;
  state.wheelMomentum = 0;
  state.dragMomentum = 0;
  state.isViewingHistory = true;

  plotData(data);
}

function getCurrentSymbol(): string {
  return element<HTMLInputElement>('#symbol').value;
}

function getTotalVisibleIntervals(): number {
  return state.data.intervals.length - (state.leftCutoff + state.rightCutoff);
}

function getMouseXRatio(): number {
  return state.mouseX / document.body.clientWidth;
}

function updateCutoff(left: number, right: number): void {
  const { intervals } = state.data;
  const newLeftCutoff = Math.max(state.leftCutoff + left, 0);
  const newRightCutoff = Math.max(state.rightCutoff + right, 0);
  const totalRemainingIntervals = intervals.length - newLeftCutoff - newRightCutoff;

  if (totalRemainingIntervals >= 50) {
    state.leftCutoff = newLeftCutoff;
    state.rightCutoff = newRightCutoff;
  } else {
    const midpoint = Math.round((newLeftCutoff + newRightCutoff) / 2);

    state.leftCutoff = midpoint - Math.round((1 - getMouseXRatio()) * 25);
    state.rightCutoff = intervals.length - state.leftCutoff - 50;
  }
}

function updateZoom(): void {
  if (getTotalVisibleIntervals() > 50 || state.wheelMomentum > 0) {
    const mouseXRatio = getMouseXRatio();

    updateCutoff(-Math.round(state.wheelMomentum * mouseXRatio), -Math.round(state.wheelMomentum * (1 - mouseXRatio)));
  }

  state.wheelMomentum *= 0.9;
}

function updateDrag(): void {
  const dragFactor = getTotalVisibleIntervals() / 5000;
  const shift = Math.round(state.dragMomentum * dragFactor);

  updateCutoff(-shift, shift);

  state.dragMomentum *= 0.9;
}

function refreshChart(): void {
  if (Math.abs(state.wheelMomentum) <= 0.1) {
    state.wheelMomentum = 0;
  } else {
    updateZoom();
  }

  if (Math.abs(state.dragMomentum) <= 0.1) {
    state.dragMomentum = 0;
  } else {
    updateDrag();
  }

  if (state.wheelMomentum === 0 && state.dragMomentum === 0) {
    return;
  }

  plotData(state.data, state.leftCutoff, state.rightCutoff, state.mouseX, state.mouseY);
  requestAnimationFrame(refreshChart);
}

function startDayTradingPractice(intervals: Interval[]): void {
  state.practice.isActive = true;
  state.practice.intervals = intervals;
  state.practice.step = 0;
  state.practice.deltas = [0];

  element('.day-trading-controls').style.display = 'inline-block';
  element('#day-trading-delta').innerHTML = '0';
  element('#day-trading-delta-total').innerHTML = '(0)';

  const vwap = getVolumeWeightedAveragePrice(intervals);

  function advanceSingleStep() {
    state.practice.step++;

    plotPartialDay(intervals, vwap, state.practice.step);

    if (state.practice.isHolding) {
      state.practice.deltas[state.practice.deltas.length - 1] = getDayTradingDelta();

      element('#day-trading-delta').innerHTML = getDayTradingDelta().toString();
      element('#day-trading-delta-total').innerHTML = `(${getDayTradingDeltaTotal().toString()})`;
    }
  }

  advanceSingleStep();

  state.practice.timer = window.setInterval(advanceSingleStep, 2000);
}

function enterDayTrade(mode: DayTradingMode): void {
  if (state.practice.isHolding) {
    return;
  }

  element('#day-trading-delta').innerHTML = '0';

  state.practice.mode = mode;
  state.practice.startingPrice = getCurrentDayTradingPrice();
  state.practice.isHolding = true;
}

function exitDayTrade(): void {
  if (!state.practice.isHolding) {
    return;
  }

  state.practice.isHolding = false;
  state.practice.deltas.push(0);

  element('#day-trading-delta').innerHTML = '0';
}

function stopDayTradingPractice(): void {
  state.practice.isActive = false;

  window.clearInterval(state.practice.timer);

  element('.day-trading-controls').style.display = 'none';
}

function getCurrentDayTradingPrice(): number {
  const { practice: { intervals, step } } = state;
  const { close } = intervals[step - 1];

  return close;
}

function getDayTradingDelta(): number {
  const deltaFactor = state.practice.mode === DayTradingMode.CALL ? 1 : -1;
  const delta = getCurrentDayTradingPrice() - state.practice.startingPrice;

  return deltaFactor * Math.round(delta * 100) / 100;
}

function getDayTradingDeltaTotal(): number {
  const sum = state.practice.deltas.reduce((sum, delta) => sum + delta, 0);

  return Math.round(sum * 100) / 100;
}

function bindEvents(): void {
  document.addEventListener('wheel', e => {
    if (!state.isViewingHistory) {
      return;
    }

    const shouldRefreshChart = (
      state.wheelMomentum === 0 &&
      state.dragMomentum === 0
    );

    state.wheelMomentum += e.deltaY;
    state.mouseX = e.clientX;

    if (shouldRefreshChart) {
      refreshChart();
    }
  });

  document.addEventListener('mousemove', e => {
    if (!state.isViewingHistory) {
      return;
    }

    const isRefreshing = state.wheelMomentum !== 0 || state.dragMomentum !== 0;

    state.mouseX = e.clientX;
    state.mouseY = e.clientY;

    if (!isRefreshing) {
      plotData(state.data, state.leftCutoff, state.rightCutoff, state.mouseX, state.mouseY);
    }
  });

  document.addEventListener('mousedown', (e: MouseEvent) => {
    if (!state.isViewingHistory) {
      return;
    }

    let { clientX: lastX } = e;

    function onMouseMove(e: MouseEvent): void {
      const { clientX: currentX } = e;
      const deltaX = currentX - lastX;

      lastX = currentX;

      const shouldRefreshChart = (
        state.wheelMomentum === 0 &&
        state.dragMomentum === 0
      );

      state.dragMomentum += deltaX;

      if (shouldRefreshChart) {
        refreshChart();
      }
    }

    document.addEventListener('mousemove', onMouseMove);

    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', onMouseMove);
    });
  });

  element('#intraday-button').addEventListener('click', () => {
    showEnhancedSymbolData(getCurrentSymbol(), IntervalType.INTRADAY);
    stopDayTradingPractice();
  });

  element('#daily-composite-button').addEventListener('click', async () => {
    const data = await loadEnhancedSymbolData(getCurrentSymbol(), IntervalType.INTRADAY);

    state.wheelMomentum = 0;
    state.dragMomentum = 0;
    state.isViewingHistory = false;

    plotDailyComposite(data);
    stopDayTradingPractice();
  });

  element('#day-trading-practice-button').addEventListener('click', async () => {
    if (state.practice.isActive) {
      return;
    }

    const data = await loadRandomDay();

    linkIntervals(data.intervals);

    state.wheelMomentum = 0;
    state.dragMomentum = 0;
    state.isViewingHistory = false;

    startDayTradingPractice(data.intervals);
  });

  element('#call-button').addEventListener('click', () => {
    enterDayTrade(DayTradingMode.CALL);
  });

  element('#put-button').addEventListener('click', () => {
    enterDayTrade(DayTradingMode.PUT);
  });

  element('#sell-button').addEventListener('click', () => {
    exitDayTrade();
  });
}

export function initialize(): void {
  bindEvents();
  showEnhancedSymbolData('SPY', IntervalType.INTRADAY);
}