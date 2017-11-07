const nodeExternals = require('webpack-node-externals');
const path = require('path');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
const slsw = require('serverless-webpack');

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  devtool: 'source-map',
  externals: [nodeExternals({
    modulesFromFile: true,
  })],
  module: {
    loaders: [
      {
        test: /\.js$/,
        loaders: ['babel-loader'],
        include: __dirname,
        exclude: /node_modules/
      }
    ]
  },
  // plugins: [
  //   new CopyWebpackPlugin([
  //     { from: 'migrations', to: 'migrations' },
  //     { from: 'scripts/migrate-sql.js', to: 'scripts/migrate-sql.js' },
  //     { from: 'gooddata-pub.key', to: 'gooddata-pub.key' }
  //   ])
  // ],
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js'
  }
};