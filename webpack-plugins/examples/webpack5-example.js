/**
 * Example of using API Inliner Plugin with Webpack 5
 * 
 * This demonstrates the compatibility with modern webpack versions.
 */

const { ApiInlinerPlugin } = require('../api-inliner-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new ApiInlinerPlugin({
      endpoints: [
        {
          url: 'https://api.example.com/data',
          outputFile: 'api-data.json',
          fallbackData: { example: 'data' },
          variableName: 'EXAMPLE_DATA'
        }
      ]
    })
  ]
};