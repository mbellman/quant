import { Interval } from '../../types';
import { getIntervalAverage } from '../utilities';

export function getHeikinAshiIntervals(intervals: Interval[]): Interval[] {
  const heikinAshiIntervals: Interval[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const previousHeikinAshi = heikinAshiIntervals[i - 1] || interval;
    const heikinAshiOpen = (previousHeikinAshi.open + previousHeikinAshi.close) / 2;

    heikinAshiIntervals.push({
      ...interval,
      open: heikinAshiOpen,
      close: getIntervalAverage(interval),
      high: Math.max(interval.high, heikinAshiOpen, interval.close),
      low: Math.min(interval.low, heikinAshiOpen, interval.close)
    });
  }

  return heikinAshiIntervals;
}
