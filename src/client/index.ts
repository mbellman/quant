import axios from 'axios';
import { plotData, plotDailyComposite } from './render';
import { SymbolData } from '../server/types';

interface State {
  data: SymbolData;
  mouseX: number;
  mouseY: number;
  leftCutoff: number;
  rightCutoff: number;
  wheelMomentum: number;
  dragMomentum: number;
  isViewingComposite: boolean;
}

async function main() {
  showSymbolData('SPY', 'intraday');

  const state: State = {
    data: {} as SymbolData,
    mouseX: 0,
    mouseY: 0,
    leftCutoff: 0,
    rightCutoff: 0,
    wheelMomentum: 0,
    dragMomentum: 0,
    isViewingComposite: false
  };

  async function getSymbolData(symbol: string, type: 'daily' | 'intraday'): Promise<SymbolData> {
    (document.querySelector('.loader-overlay') as HTMLElement).style.display = 'block';

    const { data } = await axios.get(`/api/${symbol}/${type}`);

    (document.querySelector('.loader-overlay') as HTMLElement).style.display = 'none';

    return data;
  }

  async function showSymbolData(symbol: string, type: 'daily' | 'intraday'): Promise<void> {
    (document.querySelector('#symbol') as HTMLInputElement).value = symbol;

    const data = await getSymbolData(symbol, type);

    state.data = data;
    state.leftCutoff = 0;
    state.rightCutoff = 0;
    state.wheelMomentum = 0;
    state.dragMomentum = 0;
    state.isViewingComposite = false;
  
    plotData(data);
  }

  function getCurrentSymbol(): string {
    return (document.querySelector('#symbol') as HTMLInputElement).value;
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

    plotData(state.data as SymbolData, state.leftCutoff, state.rightCutoff, state.mouseY);
    requestAnimationFrame(refreshChart);
  }

  document.addEventListener('wheel', e => {
    if (state.isViewingComposite) {
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
    if (state.isViewingComposite) {
      return;
    }

    const isRefreshing = state.wheelMomentum !== 0 || state.dragMomentum !== 0;

    state.mouseY = e.clientY;

    if (!isRefreshing) {
      plotData(state.data, state.leftCutoff, state.rightCutoff, state.mouseY);
    }
  });

  document.addEventListener('mousedown', (e: MouseEvent) => {
    if (state.isViewingComposite) {
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

  document.querySelector('#daily-button').addEventListener('click', () => {
    showSymbolData(getCurrentSymbol(), 'daily');
  });

  document.querySelector('#intraday-button').addEventListener('click', () => {
    showSymbolData(getCurrentSymbol(), 'intraday');
  });

  document.querySelector('#daily-composite-button').addEventListener('click', async () => {
    const data = await getSymbolData(getCurrentSymbol(), 'intraday');

    state.wheelMomentum = 0;
    state.dragMomentum = 0;
    state.isViewingComposite = true;

    plotDailyComposite(data);
  });
}

main();