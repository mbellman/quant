export const enum IntervalType {
  INTRADAY,
  DAILY
}

export interface Interval {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolData {
  symbol: string;
  type: IntervalType;
  intervals: Interval[];
  movingAverage50: number[];
  movingAverage100: number[];
  peaks: number[];
  dips: number[];
  prediction: number[];
}

export type IntervalPredicate = (a: Interval, b: Interval) => boolean;
