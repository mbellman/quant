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

export function predictReversals({ shortMovingAverage, longMovingAverage, momentum }: BaseSymbolData): [number[], number[]] {
  const predictedPeaks: number[] = [];
  const predictedDips: number[] = [];

  for (let i = 10; i < shortMovingAverage.length - 1; i++) {
    const previous = shortMovingAverage[i - 1] - longMovingAverage[i - 1];
    const current = shortMovingAverage[i] - longMovingAverage[i];
    const isMACross = (previous < 0 && current > 0) || (previous > 0 && current < 0);
    const isBearish = momentum[i] < momentum[i - 10];

    if (isMACross) {
      if (longMovingAverage[i] > shortMovingAverage[i] && isBearish) {
        predictedPeaks.push(i);
      } else if (longMovingAverage[i] < shortMovingAverage[i] && !isBearish) {
        predictedDips.push(i);
      }
    }
  }

  return [ predictedPeaks, predictedDips ];
}