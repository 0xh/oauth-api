const path = require('path');
const nodeExternals = require('webpack-node-externals');
const slsw = require('serverless-webpack');

module.exports = {
  mode: process.env.STAGE === 'dev' ? 'development' : 'production',
  entry: slsw.lib.entries,
  target: 'node',
  devtool: 'source-map',
  externals: [nodeExternals({
    modulesFromFile: true,
  })],
  module: {
    rules: [
      {
        test: /\.js$/,
        include: __dirname,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env'],
          },
        },
      },
    ],
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
};
