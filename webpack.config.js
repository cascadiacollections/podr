'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/**
 * If the "--production" command-line parameter is specified when invoking Heft, then the
 * "production" function parameter will be true.  You can use this to enable bundling optimizations.
 */
function createWebpackConfig({ production }) {
  const webpackConfig = {
    // Documentation: https://webpack.js.org/configuration/mode/
    mode: production ? 'production' : 'development',
    resolve: {
      extensions: ['.js', '.jsx', '.json']
    },
    module: {
      rules: [
        {
          test: /\.s[ac]ss$/i,
          use: [
            "style-loader",
            "css-loader",
            {
              loader: "sass-loader",
              options: {
                implementation: require("sass"),
              },
            },
          ],
        },
        {
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader']
        }
      ]
    },
    entry: {
      app: path.join(__dirname, 'lib', 'index.js'),
      vendor: ['react', 'react-dom']
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name]_[hash].js'
    },
    performance: {
      maxEntrypointSize: 250000,
      maxAssetSize: 250000
    },
    devServer: {
      port: 9000
    },
    devtool: production ? undefined : 'source-map',
    plugins: [
      new HtmlWebpackPlugin({
        template: 'assets/index.html',
        favicon: 'assets/favicon.ico'
      })
    ]
  };

  return webpackConfig;
}

module.exports = createWebpackConfig;
