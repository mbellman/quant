const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { serve } = require('./dist/server/server');

module.exports = {
  devtool: false,
  mode: 'development',
  entry: './client/ui.ts',
  output: {
    path: path.resolve(__dirname, 'dist/client'),
    filename: 'app.js'
  },
  devServer: {
    open: true,
    before: serve
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
      template: './client/index.html',
      inject: true
    })
  ],
  resolve: {
    extensions: ['.js', '.ts']
  }
};