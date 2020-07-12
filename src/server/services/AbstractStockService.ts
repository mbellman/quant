import { SymbolDataRequest, SymbolData, IntervalType } from '../../types';

export default abstract class AbstractStockService {
  private store: Record<string, SymbolData> = {};

  public async handle({ symbol, type }: SymbolDataRequest): Promise<SymbolData> {
    const cacheKey = `${symbol}:${type}`;

    if (this.store[cacheKey]) {
      return this.store[cacheKey];
    } else {
      const data = await this.fetch(symbol, type);

      this.store[cacheKey] = data;

      return data;
    }
  }

  protected abstract fetch(symbol: string, type: IntervalType): Promise<SymbolData>;
}