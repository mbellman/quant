import { SymbolDataRequest, SymbolData } from '../types';

export default abstract class AbstractStockService {
  private store: Record<string, SymbolData> = {};

  public abstract fetch(request: SymbolDataRequest): Promise<SymbolData>;

  public async handle({ symbol, type }: SymbolDataRequest): Promise<SymbolData> {
    const cacheKey = `${symbol}:${type}`;

    if (this.store[cacheKey]) {
      return this.store[cacheKey];
    } else {
      const data = await this.fetch({ symbol, type });

      this.store[cacheKey] = data;

      return data;
    }
  }
}