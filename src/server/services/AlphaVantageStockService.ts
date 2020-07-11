import axios from 'axios';
import AbstractStockService from './AbstractStockService';
import { IntervalType, Interval, SymbolData } from '../types';

type AlphaVantageIntervalData = {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume'?: string;
  '5. adjusted close'?: string;
  '6. volume'?: string;
};

type AlphaVantageIntervalDataSet = Record<string, AlphaVantageIntervalData>;

type AlphaVantageResponse = {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval'?: string;
  };
  'Time Series (Daily)'?: AlphaVantageIntervalDataSet;
  'Time Series (5min)'?: AlphaVantageIntervalDataSet;
};

export default class AlphaVantageStockService extends AbstractStockService {
  protected async fetch(symbol: string, type: IntervalType): Promise<SymbolData> {
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
    const intervalType = response['Meta Data']['4. Interval'] || 'Daily';
    const isIntraday = response['Meta Data']['1. Information'].includes('Intraday');
    const intervals = this.createIntervals(response[`Time Series (${intervalType})`], /* shouldIncludeExtendedHours */ !isIntraday);

    return {
      symbol: response['Meta Data']['2. Symbol'],
      type: isIntraday ? IntervalType.INTRADAY : IntervalType.DAILY,
      intervals
    };
  }

  private createIntervals(intervalDataSet: AlphaVantageIntervalDataSet, shouldIncludeExtendedHours: boolean): Interval[] {
    const intervals = Object.keys(intervalDataSet).map(key => {
      const intervalData = intervalDataSet[key];
      const adjustedClose = parseFloat(intervalData['5. adjusted close'] || intervalData['4. close']);
      const adjustmentFactor = adjustedClose / parseFloat(intervalData['4. close']);

      return {
        time: key,
        open: parseFloat(intervalData['1. open']) * adjustmentFactor,
        high: parseFloat(intervalData['2. high']) * adjustmentFactor,
        low: parseFloat(intervalData['3. low']) * adjustmentFactor,
        close: parseFloat(intervalData['4. close']) * adjustmentFactor,
        volume: parseFloat(intervalData['5. volume'] || intervalData['6. volume'])
      };
    }).reverse();

    if (shouldIncludeExtendedHours) {
      return intervals;
    } else {
      return intervals.filter(({ time }) => {
        const date = new Date(time);
        const hour = date.getHours();
        const minute = date.getMinutes();
        const t = parseFloat(`${hour}.${minute < 10 ? '0' : ''}${minute}`);

        return t >= 9.31 && t <= 16;
      });
    }
  }

  private createRequestParams(symbol: string, type: IntervalType): any {
    const baseParams = {
      symbol,
      apikey: 'M6DLG2L0G8O2F50G',
      outputsize: 'full'
    };

    if (type === IntervalType.DAILY) {
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