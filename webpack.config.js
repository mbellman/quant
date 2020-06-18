const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devtool: false,
  mode: 'development',
  entry: './src/client/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/client'),
    filename: 'app.js'
  },
  devServer: {
    open: true,
    before: app => {
      app.get('/api/:symbol/:type', async (req, res) => {
        const { getSymbolData } = require('./dist/server');
        const data = await getSymbolData(req.params);

        res.send(data);
      });
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './src/client/index.html',
      inject: true
    })
  ],
  resolve: {
    extensions: ['.js', '.ts']
  }
};