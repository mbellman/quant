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

export function predictReversals({ intervals, peaks, dips, shortMovingAverage, longMovingAverage }: BaseSymbolData): [number[], number[]] {
  const predictedPeaks: number[] = [];
  const predictedDips: number[] = [];

  for (let i = 20; i < intervals.length; i++) {
    if (isAverageReversal(shortMovingAverage, longMovingAverage, i)) {
      switch (getLocalPriceTrend(intervals, i)) {
        case PriceTrend.DOWNWARD:
        case PriceTrend.DOWNWARD_REVERSAL:
        case PriceTrend.DOWNWARD_SPIKE:
          predictedPeaks.push(i);
          break;
        case PriceTrend.UPWARD:
        case PriceTrend.UPWARD_REVERSAL:
        case PriceTrend.UPWARD_SPIKE:
          predictedDips.push(i);
          break;
        case PriceTrend.FLAT:
          if (shortMovingAverage[i] > longMovingAverage[i]) {
            predictedDips.push(i);
          } else {
            predictedPeaks.push(i);
          }

          break;
      }
    }
  }

  return [ predictedPeaks, predictedDips ];
}