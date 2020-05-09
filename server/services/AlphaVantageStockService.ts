import AbstractStockService, { StockData } from './AbstractStockService';
import intradayMockData from './mocks/msft-intraday.json';
import dailyMockData from './mocks/msft-daily.json';

export default class AlphaVantageStockService extends AbstractStockService {
  public async fetch(symbol: string): Promise<StockData> {
    return this.transform(intradayMockData);
  }

  private transform(data: any): StockData {
    const shares = this.transformShares(data['Time Series (5min)']);

    return {
      range: {
        high: Math.max(...shares),
        low: Math.min(...shares)
      },
      shares,
      prediction: []
    };
  }

  private transformShares(shares: any): number[] {
    return Object.keys(shares).map(key => parseFloat(shares[key]['4. close'])).reverse();
  }
}