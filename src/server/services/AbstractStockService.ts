import { SymbolData } from '../types';

export default abstract class AbstractStockService {
  public abstract fetch(symbol: string): Promise<SymbolData>;
}