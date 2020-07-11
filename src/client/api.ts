import axios from 'axios';
import { IntervalType, SymbolData } from '../server/types';

export async function fetchSymbolData(symbol: string, type: IntervalType): Promise<SymbolData> {
  const { data } = await axios.get(`/api/${symbol}/${type}`);

  return data;
}

export async function fetchRandomDay(): Promise<SymbolData> {
  const { data } = await axios.get('/api/random');

  return data;
}