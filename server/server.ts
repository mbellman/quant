import AlphaVantageStockService from './services/AlphaVantageStockService';
import { StockData } from './services/AbstractStockService';

const service = new AlphaVantageStockService();

export function getSymbolData(symbol: string): Promise<StockData> {
  return service.fetch(symbol);
}