import AbstractStockService from './AbstractStockService';
import { IntervalType, Interval, SymbolData } from '../types';
import msft from '../samples/msft.json';
import msftDaily from '../samples/msft-daily.json';
import aapl from '../samples/aapl.json';
import aaplDaily from '../samples/aapl-daily.json';
import amd from '../samples/amd.json';
import amdDaily from '../samples/amd-daily.json';
import { getMovingAverage, getDips, getPeaks } from '../analysis';
import { predictReversals } from '../prediction';

type AlphaVantageShareData = {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume'?: string;
  '5. adjusted close'?: string;
  '6. volume'?: string;
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
    const isIntraday = response['Meta Data']['1. Information'].includes('Intraday');

    const data: SymbolData = {
      symbol: response['Meta Data']['2. Symbol'],
      type: isIntraday ? IntervalType.INTRADAY : IntervalType.DAILY,
      intervals,
      movingAverage50: getMovingAverage(intervals, 50),
      movingAverage100: getMovingAverage(intervals, 100),
      peaks: getPeaks(intervals),
      dips: getDips(intervals),
      predictedReversals: []
    };

    data.predictedReversals = predictReversals(data);

    return data;
  }

  private createIntervals(shares: AlphaVantageShareDataSet): Interval[] {
    return Object.keys(shares).map(key => {
      const shareData = shares[key];
      const adjustedClose = parseFloat(shareData['5. adjusted close'] || shareData['4. close']);
      const adjustmentFactor = adjustedClose / parseFloat(shareData['4. close']);

      return {
        time: key,
        open: parseFloat(shareData['1. open']) * adjustmentFactor,
        high: parseFloat(shareData['2. high']) * adjustmentFactor,
        low: parseFloat(shareData['3. low']) * adjustmentFactor,
        close: parseFloat(shareData['4. close']) * adjustmentFactor,
        volume: parseFloat(shareData['5. volume'] || shareData['6. volume'])
      };
    }).reverse();
  }
}