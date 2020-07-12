export const enum IntervalType {
  INTRADAY = 'intraday',
  DAILY = 'daily'
}

export const enum PriceTrend {
  UPWARD,
  DOWNWARD
}

export interface Interval {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  next?: Interval;
  previous?: Interval;
}

export interface SymbolData {
  symbol: string;
  type: IntervalType;
  intervals: Interval[];
}

export interface EnhancedSymbolData extends SymbolData {
  momentum: number[];
  vwap: number[];
  shortMovingAverage: number[];
  longMovingAverage: number[];
  peaks: number[];
  dips: number[];
}

export type IntervalPredicate = (a: Interval, b: Interval) => boolean;

export interface SymbolDataRequest {
  symbol: string;
  type: IntervalType;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export interface Range {
  high: number;
  low: number;
}