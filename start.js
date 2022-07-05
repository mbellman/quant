const express = require('express');
const app = express();

app.listen(process.env.PORT || 1234);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/dist/client/index.html');
});

app.get('/api/:symbol/:type', async (req, res) => {
  const { getSymbolData } = require('./dist/server');
  const data = await getSymbolData(req.params);

  res.send(data);
});

app.get('/api/random', async (req, res) => {
  const { getRandomDay } = require('./dist/server');
  const data = await getRandomDay();

  res.send(data);
});

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/dist/client/' + req.originalUrl);
});