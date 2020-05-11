import AlphaVantageStockService from './services/AlphaVantageStockService';
import { SymbolData } from './types';

const service = new AlphaVantageStockService();

export function getSymbolData(symbol: string): Promise<SymbolData> {
  return service.fetch(symbol);
}