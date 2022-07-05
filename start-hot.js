const { exec } = require('child_process');

const webpack = exec('webpack-dev-server --config webpack.config.js', console.log);
const tsc = exec('npm run tsc --watch', console.log);

tsc.stdout.on('data', console.log);
webpack.stdout.on('data', console.log);