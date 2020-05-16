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

export interface BaseSymbolData {
  symbol: string;
  type: IntervalType;
  intervals: Interval[];
  movingAverage50: number[];
  movingAverage100: number[];
  peaks: number[];
  dips: number[];
}

export interface SymbolData extends BaseSymbolData {
  predictedPeaks: number[];
  predictedDips: number[];
}

export type IntervalPredicate = (a: Interval, b: Interval) => boolean;
