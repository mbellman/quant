import AbstractStockService from './AbstractStockService';
import { Interval, SymbolData } from '../types';
import msft from '../samples/msft.json';
import msftDaily from '../samples/msft-daily.json';
import aapl from '../samples/aapl.json';
import aaplDaily from '../samples/aapl-daily.json';
import amd from '../samples/amd.json';
import amdDaily from '../samples/amd-daily.json';
import { getMovingAverage } from '../analysis';

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
    '4. Interval'?: string;
  };
  'Time Series (Daily)'?: AlphaVantageShareDataSet;
  'Time Series (5min)'?: AlphaVantageShareDataSet;
};

export default class AlphaVantageStockService extends AbstractStockService {
  public async fetch(symbol: string): Promise<SymbolData> {
    try {
      return this.transform(amd);
    } catch(e) {
      console.log(e);
    }
  }

  private transform(response: AlphaVantageResponse): SymbolData {
    const interval = response['Meta Data']['4. Interval'] || 'Daily';
    const intervals = this.createIntervals(response[`Time Series (${interval})`]);
    const highs = intervals.map(({ high }) => high);
    const lows = intervals.map(({ low }) => low);

    return {
      range: {
        high: Math.max(...highs),
        low: Math.min(...lows)
      },
      intervals,
      movingAverage: getMovingAverage(intervals),
      prediction: []
    };
  }

  private createIntervals(shares: AlphaVantageShareDataSet): Interval[] {
    return Object.keys(shares).map(key => {
      const shareData = shares[key];

      return {
        open: parseFloat(shareData['1. open']),
        high: parseFloat(shareData['2. high']),
        low: parseFloat(shareData['3. low']),
        close: parseFloat(shareData['4. close'])
      };
    }).reverse();
  }
}