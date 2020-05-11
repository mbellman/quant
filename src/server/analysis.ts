import { Interval } from './types';

const getAverage = (numbers: number[]) =>
  numbers.reduce((total, n) => total + n, 0) / numbers.length;

export function getMovingAverage(intervals: Interval[]): number[] {
  const intervalAverages = intervals.map(({ high, low }) => (high + low) / 2);

  return intervalAverages.reduce((movingAverage, _, index) => {
    const start = Math.max(index - 50, 0);
    const end = index + 1;
    const runningAverage = getAverage(intervalAverages.slice(start, end));

    movingAverage.push(runningAverage);

    return movingAverage;
  }, []);
}