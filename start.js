const { exec } = require('child_process');
const webpack = exec('webpack-dev-server --config webpack.config.js', console.log);

webpack.stdout.on('data', console.log);