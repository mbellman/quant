import { fetchEnhancedSymbolData, fetchRandomDay } from './api';
import { plotData, plotDailyComposite, plotPartialDay } from './render';
import { IntervalType, SymbolData, EnhancedSymbolData } from '../types';
import { linkIntervals } from './utilities';
import { getHeikinAshiIntervals } from './technicals/heikin-ashi';
import { getVolumeWeightedAveragePrice } from './technicals/vwap';

interface DayTradingPracticeState {
  index: number;
  lastBuyPrice: number;
  totalDelta: number;
  isActive: boolean;
  isHolding: boolean;
  interval: number;
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
    index: 0,
    lastBuyPrice: 0,
    totalDelta: 0,
    isActive: false,
    isHolding: false,
    interval: null
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

function getTotalVisibleIntervals() {
  return state.data.intervals.length - (state.leftCutoff + state.rightCutoff);
}

function updateCutoff(left: number, right: number): void {
  const newLeftCutoff = Math.max(state.leftCutoff + left, 0);
  const newRightCutoff = Math.max(state.rightCutoff + right, 0);
  const totalRemainingIntervals = state.data.intervals.length - newRightCutoff - newLeftCutoff;

  if (totalRemainingIntervals > 50) {
    state.leftCutoff = newLeftCutoff;
    state.rightCutoff = newRightCutoff;
  }
}

function updateZoom(): void {
  const r = state.mouseX / document.body.clientWidth;

  updateCutoff(-Math.round(state.wheelMomentum * r), -Math.round(state.wheelMomentum * (1 - r)));

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

function startDayTradingPractice({ intervals }: SymbolData): void {
  state.practice.isActive = true;

  element('.day-trading-controls').style.display = 'inline-block';  

  const vwap = getVolumeWeightedAveragePrice(intervals);
  let step = 1;

  function advanceSingleStep() {
    plotPartialDay(intervals, vwap, step);

    step++;
  }

  advanceSingleStep();

  state.practice.interval = window.setInterval(advanceSingleStep, 2000);
}

function stopDayTradingPractice(): void {
  state.practice.isActive = false;

  window.clearInterval(state.practice.interval);

  element('.day-trading-controls').style.display = 'none';
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
    state.wheelMomentum *= 1.1;
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

  element('#daily-button').addEventListener('click', () => {
    showEnhancedSymbolData(getCurrentSymbol(), IntervalType.DAILY);
    stopDayTradingPractice();
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

    startDayTradingPractice(data);
  });
}

export function initialize(): void {
  bindEvents();
  showEnhancedSymbolData('SPY', IntervalType.INTRADAY);
}