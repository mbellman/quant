export const enum IntervalType {
  INTRADAY,
  DAILY
}

export const enum PriceTrend {
  UPWARD,
  UPWARD_SPIKE,
  UPWARD_REVERSAL,
  DOWNWARD,
  DOWNWARD_SPIKE,
  DOWNWARD_REVERSAL,
  FLAT
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
  shortMovingAverage: number[];
  longMovingAverage: number[];
  peaks: number[];
  dips: number[];
  momentum: number[];
}

export interface SymbolData extends BaseSymbolData {
  predictedPeaks: number[];
  predictedDips: number[];
}

export type IntervalPredicate = (a: Interval, b: Interval) => boolean;

export interface SymbolDataRequest {
  symbol: string;
  type: 'daily' | 'intraday';
}