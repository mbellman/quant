import axios from 'axios';
import { IntervalType, SymbolData, EnhancedSymbolData } from '../server/types';
import { getMomentum } from './technicals/momentum';
import { getMovingAverage } from './technicals/average';
import { getPeaks, getDips } from './technicals/extremes';

export async function fetchEnhancedSymbolData(symbol: string, type: IntervalType): Promise<EnhancedSymbolData> {
  const { data } = await axios.get(`/api/${symbol}/${type}`);
  const { intervals } = data;

  return {
    ...data,
    momentum: getMomentum(intervals),
    shortMovingAverage: getMovingAverage(intervals, 10),
    longMovingAverage: getMovingAverage(intervals, 20),
    peaks: getPeaks(intervals),
    dips: getDips(intervals)
  };
}

export async function fetchRandomDay(): Promise<SymbolData> {
  const { data } = await axios.get('/api/random');

  return data;
}