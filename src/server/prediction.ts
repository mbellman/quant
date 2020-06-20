import { BaseSymbolData, Interval, PriceTrend } from './types';
import { getLocalPriceTrend } from './analysis';

function isAverageReversal(shortMovingAverage: number[], longMovingAverage: number[], index: number): boolean {
  return (
    shortMovingAverage[index - 1] - longMovingAverage[index - 1] > 0 &&
    shortMovingAverage[index] - longMovingAverage[index] < 0 ||
    shortMovingAverage[index - 1] - longMovingAverage[index - 1] < 0 &&
    shortMovingAverage[index] - longMovingAverage[index] > 0
  );
}

function getMomentumDeltas(momentum: number[]): number[] {
  const deltas: number[] = [];

  for (let i = 0; i < momentum.length; i++) {
    const current = momentum[i];
    const previous = momentum[i - 1] || 0;

    deltas.push(current - previous);
  }

  return deltas;
}

export function predictReversals(momentum: number[]): [number[], number[]] {
  const predictedPeaks: number[] = [];
  const predictedDips: number[] = [];
  const momentumDeltas = getMomentumDeltas(momentum);
  const reversalThreshold = 2;
  let signal = 0;

  for (let i = 1; i < momentumDeltas.length; i++) {
    const current = momentumDeltas[i];
    const previous = momentumDeltas[i - 1];
    const isStrongTrend = Math.abs(current) / Math.abs(previous) > reversalThreshold;

    signal *= 0.9;

    if (isStrongTrend) {
      const isUpwardTrend = current >= 0;

      signal += isUpwardTrend ? 1 : -1;

      if (signal >= 2) {
        predictedDips.push(i);

        signal = 0;
      } else if (signal <= -2) {
        predictedPeaks.push(i);

        signal = 0;
      }
    }
  }

  return [ predictedPeaks, predictedDips ];
}