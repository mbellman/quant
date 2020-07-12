import { Interval } from '../../types';
import { getAverage } from '../utilities';

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