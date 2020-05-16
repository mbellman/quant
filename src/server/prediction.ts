import { SymbolData, IntervalPredicate, Interval } from './types';

function getDelta(a: Interval, b: Interval): number {
  return a.close / b.close;
}

export function predictReversals({ intervals, peaks, dips, movingAverage50, movingAverage100 }: SymbolData): number[] {
  const reversals: number[] = [];

  for (let i = 1; i < intervals.length; i++) {
    const isAverageReversal = (
      movingAverage50[i - 1] - movingAverage100[i - 1] > 0 &&
      movingAverage50[i] - movingAverage100[i] < 0 ||
      movingAverage50[i - 1] - movingAverage100[i - 1] < 0 &&
      movingAverage50[i] - movingAverage100[i] > 0
    );

    if (isAverageReversal) {
      reversals.push(i);

      i += 5;
    }
  }

  return reversals;
}