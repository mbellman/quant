import { Interval } from "../types";

export function getAverage(numbers: number[]) {
  return numbers.reduce((total, n) => total + n, 0) / numbers.length;
}

export function linkIntervals(intervals: Interval[]): void {
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];

    interval.previous = intervals[i - 1] || interval;
    interval.next = intervals[i + 1] || interval;
  }
}