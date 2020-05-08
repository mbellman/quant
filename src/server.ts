import path from 'path';
import express from 'express';
import AlphaVantageStockService from './services/AlphaVantageStockService';

const app = express();

app.get('/api/*', async (req, res) => {
  const service = new AlphaVantageStockService();
  const data = await service.fetch('MSFT');

  res.send(data);
});

app.get('/*', (req, res) => {
  if (req.originalUrl === '/') {
    res.sendFile(path.resolve(__dirname, '../src/index.html'));
  } else {
    res.sendFile(path.join(__dirname, req.originalUrl));
  }
});

app.listen(1234, () => console.log('\nhttp://localhost:1234'));