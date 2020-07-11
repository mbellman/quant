import { Interval } from '../../server/types';

export function getMomentum(intervals: Interval[]): number[] {
  const momentum: number[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const delta = interval.close - interval.open;
    const runningMomentum = (momentum[i - 1] || 0) + delta;

    momentum.push(runningMomentum);
  }

  return momentum;
}