import { Interval, IntervalPredicate } from '../../server/types';

function isReversal(intervals: Interval[], index: number, predicate: IntervalPredicate): boolean {
  const interval = intervals[index];

  const isImmediateReversal = [
    ...intervals.slice(index - 5, index - 1),
    ...intervals.slice(index + 1, index + 5)
  ].filter(Boolean).every(comparison => predicate(interval, comparison));

  const isLocalReversal = [
    ...intervals.slice(index - 25, index - 1),
    ...intervals.slice(index + 1, index + 25)
  ].filter(Boolean).filter(comparison => predicate(interval, comparison)).length > 45;

  return isImmediateReversal && isLocalReversal;
}

function getReversals(intervals: Interval[], predicate: IntervalPredicate): number[] {
  const reversals: number[] = [];

  for (let i = 1; i < intervals.length; i++) {
    if (isReversal(intervals, i, predicate)) {
      reversals.push(i);

      i += 10;
    }
  }

  return reversals;
}

export function getDips(intervals: Interval[]): number[] {
  return getReversals(intervals, (first, next) => first.low < next.low);
}

export function getPeaks(intervals: Interval[]): number[] {
  return getReversals(intervals, (first, next) => first.high > next.high);
}