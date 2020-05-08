export interface Range {
  high: number;
  low: number;
}

export interface StockData {
  range: Range;
  shares: any[];
  prediction: any[];
}

export default abstract class AbstractStockService {
  public abstract fetch(symbol: string): Promise<StockData>;
}