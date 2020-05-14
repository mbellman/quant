export interface Interval {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SymbolData {
  intervals: Interval[];
  movingAverage50: number[];
  movingAverage100: number[];
  peaks: number[];
  dips: number[];
  prediction: number[];
}