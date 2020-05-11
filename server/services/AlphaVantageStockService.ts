import AbstractStockService, { StockData } from './AbstractStockService';
import msft57 from '../samples/msft-05-07-20.json';
import msft58 from '../samples/msft-05-08-20.json';

type AlphaVantageShareData = {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
};

type AlphaVantageShareDataSet = Record<string, AlphaVantageShareData>;

type AlphaVantageResponse = {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
    '5. Output Size': string;
    '6. Time Zone': string;
  };
  'Time Series (Daily)'?: AlphaVantageShareDataSet;
  'Time Series (5min)'?: AlphaVantageShareDataSet;
};

export default class AlphaVantageStockService extends AbstractStockService {
  public async fetch(symbol: string): Promise<StockData> {
    return this.transform(msft57);
  }

  private transform(response: AlphaVantageResponse): StockData {
    const interval = response['Meta Data']['4. Interval'];
    const shares = this.transformShares(response[`Time Series (${interval})`]);

    return {
      range: {
        high: Math.max(...shares),
        low: Math.min(...shares)
      },
      shares,
      prediction: []
    };
  }

  private transformShares(shares: AlphaVantageShareDataSet): number[] {
    return Object.keys(shares).map(key => parseFloat(shares[key]['4. close'])).reverse();
  }
}