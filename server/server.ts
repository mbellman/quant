import AlphaVantageStockService from './services/AlphaVantageStockService'
import { Express } from 'express';

export function serve(app: Express): void {
  app.get('/api/*', async (req, res) => {
    const service = new AlphaVantageStockService();
    const data = await service.fetch('MSFT');
  
    res.send(data);
  });
}