import axios from 'axios';
import AbstractStockService from './AbstractStockService';
import { IntervalType, Interval, SymbolDataRequest, SymbolData, BaseSymbolData } from '../types';
import { getMovingAverage, getDips, getPeaks, getMomentum } from '../analysis';
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
  public async fetch({ symbol, type }: SymbolDataRequest): Promise<SymbolData> {
    try {
      const { data } = await axios.get('https://www.alphavantage.co/query', {
        params: this.createRequestParams(symbol, type)
      });

      return this.transform(data);
    } catch(e) {
      console.log(e);
    }
  }

  private transform(response: AlphaVantageResponse): SymbolData {
    const interval = response['Meta Data']['4. Interval'] || 'Daily';
    const isIntraday = response['Meta Data']['1. Information'].includes('Intraday');
    const intervals = this.createIntervals(response[`Time Series (${interval})`], isIntraday);
    const momentum = getMomentum(intervals);

    const data: BaseSymbolData = {
      symbol: response['Meta Data']['2. Symbol'],
      type: isIntraday ? IntervalType.INTRADAY : IntervalType.DAILY,
      intervals,
      shortMovingAverage: getMovingAverage(intervals, 10),
      longMovingAverage: getMovingAverage(intervals, 20),
      peaks: getPeaks(intervals),
      dips: getDips(intervals),
      momentum
    };

    const [ predictedPeaks, predictedDips ] = predictReversals(data);

    return {
      ...data,
      predictedDips,
      predictedPeaks
    };
  }

  private createIntervals(shares: AlphaVantageShareDataSet, shouldFilterOffHours: boolean): Interval[] {
    const intervals = Object.keys(shares).map(key => {
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

    if (shouldFilterOffHours) {
      return intervals.filter(({ time }) => {
        const date = new Date(time);
        const hour = date.getHours();
        const minute = date.getMinutes();
        const t = parseFloat(`${hour}.${minute < 10 ? '0' : ''}${minute}`);

        return t >= 9.31 && t <= 16;
      });
    } else {
      return intervals;
    }
  }

  private createRequestParams(symbol: string, type: 'daily' | 'intraday'): any {
    const baseParams = {
      symbol,
      apikey: 'M6DLG2L0G8O2F50G',
      outputsize: 'full'
    };

    if (type === 'daily') {
      return {
        ...baseParams,
        function: 'TIME_SERIES_DAILY_ADJUSTED'
      };
    } else {
      return {
        ...baseParams,
        function: 'TIME_SERIES_INTRADAY',
        interval: '1min'
      };
    }
  }
}