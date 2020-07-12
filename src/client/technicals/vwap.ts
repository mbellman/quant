import { Interval } from '../../types';
import { getIntervalAverage } from '../utilities';

function getSum(numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0);
}

export function getVolumeWeightedAveragePrice(intervals: Interval[]): number[] {
  const vwap: number[] = [];
  const volumeWeightedPrices: number[] = [];
  const volumes: number[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const previous = intervals[i - 1] || interval;
    const shouldReset = new Date(interval.time).getDate() !== new Date(previous.time).getDate();

    if (shouldReset) {
      volumeWeightedPrices.length = 0;
      volumes.length = 0;
    }

    volumeWeightedPrices.push(interval.volume * getIntervalAverage(interval));
    volumes.push(interval.volume);

    vwap.push(getSum(volumeWeightedPrices) / getSum(volumes));
  }

  return vwap;
}
