import { Interval, IntervalPredicate } from './types';

function getAverage(numbers: number[]) {
  return numbers.reduce((total, n) => total + n, 0) / numbers.length;
}

function isReversal(intervals: Interval[], index: number, predicate: IntervalPredicate): boolean {
  const interval = intervals[index];

  return [
    intervals[index - 1],
    ...intervals.slice(index + 1, index + 25)
  ].filter(Boolean).every(comparison => predicate(interval, comparison));
}

function getReversals(intervals: Interval[], predicate: IntervalPredicate): number[] {
  const reversals: number[] = [];

  for (let i = 0; i < intervals.length; i++) {
    if (isReversal(intervals, i, predicate)) {
      reversals.push(i);

      i += 10;
    }
  }

  return reversals;
}

export function getMovingAverage(intervals: Interval[], limit: number): number[] {
  const intervalAverages = intervals.map(({ high, low }) => (high + low) / 2);

  return intervalAverages.reduce((movingAverage, _, index) => {
    const start = Math.max(index - limit, 0);
    const end = index + 1;
    const runningAverage = getAverage(intervalAverages.slice(start, end));

    movingAverage.push(runningAverage);

    return movingAverage;
  }, []);
}

export function getDips(intervals: Interval[]): number[] {
  return getReversals(intervals, (first, next) => first.low < next.low);
}

export function getPeaks(intervals: Interval[]): number[] {
  return getReversals(intervals, (first, next) => first.high > next.high);
}