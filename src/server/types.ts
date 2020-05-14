export interface Interval {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolData {
  intervals: Interval[];
  movingAverage: number[];
  peaks: number[];
  dips: number[];
  prediction: number[];
}