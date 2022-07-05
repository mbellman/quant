const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

function clearModuleCache() {
  Object.keys(require.cache).forEach(key => delete require.cache[key]);
}

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
    port: process.env.PORT || 1234,
    onBeforeSetupMiddleware: ({ app }) => {
      app.get('/api/:symbol/:type', async (req, res) => {
        clearModuleCache();

        const { getSymbolData } = require('./dist/server');
        const data = await getSymbolData(req.params);

        res.send(data);
      });

      app.get('/api/random', async (req, res) => {
        clearModuleCache();

        const { getRandomDay } = require('./dist/server');
        const data = await getRandomDay();

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