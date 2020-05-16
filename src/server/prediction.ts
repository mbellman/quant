import { BaseSymbolData, Interval } from './types';

function isAverageReversal(movingAverage50: number[], movingAverage100: number[], index: number): boolean {
  return (
    movingAverage50[index - 1] - movingAverage100[index - 1] > 0 &&
    movingAverage50[index] - movingAverage100[index] < 0 ||
    movingAverage50[index - 1] - movingAverage100[index - 1] < 0 &&
    movingAverage50[index] - movingAverage100[index] > 0
  );
}

export function predictReversals({ intervals, peaks, dips, movingAverage50, movingAverage100 }: BaseSymbolData): [number[], number[]] {
  const predictedPeaks: number[] = [];
  const predictedDips: number[] = [];

  for (let i = 1; i < intervals.length; i++) {
    if (isAverageReversal(movingAverage50, movingAverage100, i)) {
      if (movingAverage50[i] > movingAverage100[i]) {
        predictedDips.push(i);
      } else {
        predictedPeaks.push(i);
      }

      i += 5;
    }
  }

  return [predictedPeaks, predictedDips];
}