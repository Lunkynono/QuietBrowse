const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  target: 'web',
  entry: {
    background: './src/background/index.ts',
    'content-script': './src/content/index.ts',
    popup: './src/popup/index.tsx',
  },
  output: { path: path.resolve(__dirname, 'dist'), filename: '[name].js', clean: true },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      vm: require.resolve('vm-browserify'),
    },
  },
  module: {
    rules: [
      { test: /\.tsx?$/, exclude: /node_modules/, use: { loader: 'ts-loader', options: { transpileOnly: true } } },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './src/popup/index.html', filename: 'popup.html', chunks: ['popup'] }),
    new CopyWebpackPlugin({ patterns: [{ from: 'public/manifest.json', to: 'manifest.json' }] }),
  ],
  performance: { hints: false },
};
