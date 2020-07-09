import AlphaVantageStockService from './services/AlphaVantageStockService';
import { SymbolData, SymbolDataRequest, Interval, IntervalType } from './types';

const service = new AlphaVantageStockService();

function randomFrom<T>(array: T[]): T {
  const index = Math.floor(Math.random() * array.length);

  return array[index];
}

export function getSymbolData(request: SymbolDataRequest): Promise<SymbolData> {
  return service.handle(request);
}

export async function getRandomDay(): Promise<SymbolData> {
  const symbols = [
    'MSFT',
    'FB',
    'AAPL',
    'SQ',
    'TWTR',
    'SPY',
    'TSLA'
  ];

  const symbol = randomFrom(symbols);
  const data = await service.handle({ symbol, type: 'intraday' });
  const dayGroupedIntervals: Record<string, Interval[]> = {};

  for (const interval of data.intervals) {
    const date = new Date(interval.time);
    const dayKey = `${date.getMonth()}:${date.getDate()}:${date.getFullYear()}`;

    if (!dayGroupedIntervals[dayKey]) {
      dayGroupedIntervals[dayKey] = [];
    }

    dayGroupedIntervals[dayKey].push(interval);
  }

  const dayGroups = Object.keys(dayGroupedIntervals).map(key => dayGroupedIntervals[key]);
  const intervals = randomFrom(dayGroups);

  return { intervals } as SymbolData;
}