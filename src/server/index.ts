import AlphaVantageStockService from './services/AlphaVantageStockService';
import { SymbolData, SymbolDataRequest, IntervalType } from './types';

const service = new AlphaVantageStockService();

export function getSymbolData(request: SymbolDataRequest): Promise<SymbolData> {
  return service.handle(request);
}