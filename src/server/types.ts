export interface Range {
  high: number;
  low: number;
}

export interface Interval {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SymbolData {
  range: Range;
  intervals: Interval[];
  movingAverage: number[];
  peaks: number[];
  dips: number[];
  prediction: number[];
}