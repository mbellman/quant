import axios from 'axios';
import { IntervalType, SymbolData, EnhancedSymbolData } from '../types';
import { getMomentum } from './technicals/momentum';
import { getMovingAverage } from './technicals/average';
import { getPeaks, getDips } from './technicals/extremes';
import { getVolumeWeightedAveragePrice } from './technicals/vwap';

export async function fetchEnhancedSymbolData(symbol: string, type: IntervalType): Promise<EnhancedSymbolData> {
  const { data } = await axios.get(`/api/${symbol}/${type}`);
  const { intervals } = data;

  return {
    ...data,
    vwap: getVolumeWeightedAveragePrice(intervals),
    momentum: getMomentum(intervals),
    shortMovingAverage: getMovingAverage(intervals, 12),
    longMovingAverage: getMovingAverage(intervals, 26),
    peaks: getPeaks(intervals),
    dips: getDips(intervals)
  };
}

export async function fetchRandomDay(): Promise<SymbolData> {
  const { data } = await axios.get('/api/random');

  return data;
}