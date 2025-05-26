'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { ApiInlinerPlugin } = require('./webpack-plugins/api-inliner-plugin');
const TopPodcastsPlugin = require('./webpack-plugins/top-podcasts-plugin'); // Keep for backward compatibility

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
            production ? MiniCssExtractPlugin.loader : "style-loader",  // Use MiniCssExtractPlugin for production
            "css-loader",  // Resolves CSS imports, URLs, and optimizes CSS
            "postcss-loader", // Add vendor prefixes or use post-processing tools (optional)
            {
              loader: "sass-loader",
              options: {
                implementation: require("sass"),  // Use Dart Sass (modern SASS implementation)
                sourceMap: !production,  // Enable source maps in development mode for easier debugging
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
      filename: '[name]_[contenthash].js'
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
      }),
      ...(production ? [new MiniCssExtractPlugin({
        filename: '[name]_[contenthash].css'
      })] : []),
      require('autoprefixer'),  // Automatically add vendor prefixes for cross-browser compatibility
      
      // Use the API Inliner plugin
      // This would typically be configured through a separate config file
      // when using the Heft plugin integration
      new ApiInlinerPlugin({
        // Note: production flag is now automatically determined from process.env.NODE_ENV
        // but can still be overridden here if needed
        inlineAsVariable: true,
        emitDeclarationFile: true, // Generate TypeScript declaration file
        declarationFilePath: 'api-inliner.d.ts', // Path relative to output directory
        endpoints: [{
          url: 'https://podr-svc-48579879001.us-west4.run.app/?q=toppodcasts&limit=10',
          outputFile: 'top-podcasts.json',
          fallbackData: { feed: { entry: [] } },
          variableName: 'PODR_TOP_PODCASTS', // Keep the same variable name for backward compatibility
          // Specify the TypeScript type for this data
          typeReference: '{ feed: { entry: ReadonlyArray<import("../src/ui/AppFunctional").ITopPodcast> } }'
        }]
      })
    ]
  };

  return webpackConfig;
}

module.exports = createWebpackConfig;
