import axios from 'axios';
import { plotData } from './render';

async function main() {
  const { data } = await axios.get('/api/test');

  plotData(data);

  const state = {
    mouseX: 0,
    leftCutoff: 0,
    rightCutoff: 0,
    wheelMomentum: 0,
    dragMomentum: 0
  };

  function getTotalVisibleIntervals() {
    return data.intervals.length - (state.leftCutoff + state.rightCutoff);
  }

  function updateCutoff(left: number, right: number): void {
    const newLeftCutoff = Math.max(state.leftCutoff + left, 0);
    const newRightCutoff = Math.max(state.rightCutoff + right, 0);
    const totalRemainingIntervals = data.intervals.length - newRightCutoff - newLeftCutoff;

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

    plotData(data, state.leftCutoff, state.rightCutoff);
    requestAnimationFrame(refreshChart);
  }

  function onMouseDown(e: MouseEvent): void {
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
  }

  document.body.addEventListener('wheel', e => {
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

  document.addEventListener('mousedown', onMouseDown);
}

main();