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
        alwaysFetchFromApi: true, // Always attempt to fetch from API, regardless of environment
        emitDeclarationFile: true, // Generate TypeScript declaration file
        declarationFilePath: 'api-inliner.d.ts', // Path relative to output directory
        endpoints: [{
          url: 'https://podr-svc-48579879001.us-west4.run.app/?q=toppodcasts&limit=10',
          outputFile: 'top-podcasts.json',
          fallbackData: {
            feed: {
              entry: [
                {
                  "title": {"label": "The Joe Rogan Experience"},
                  "id": {"label": "https://podcasts.apple.com/us/podcast/the-joe-rogan-experience/id360084272", "attributes": {"im:id": "360084272"}},
                  "im:image": [
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/23/7a/5c/237a5c31-649f-6c21-d2d9-07145044fede/mza_6530649916119460095.jpg/55x55bb.png"},
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/23/7a/5c/237a5c31-649f-6c21-d2d9-07145044fede/mza_6530649916119460095.jpg/60x60bb.png"},
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/23/7a/5c/237a5c31-649f-6c21-d2d9-07145044fede/mza_6530649916119460095.jpg/170x170bb.png"}
                  ]
                },
                {
                  "title": {"label": "SmartLess"},
                  "id": {"label": "https://podcasts.apple.com/us/podcast/smartless/id1521578868", "attributes": {"im:id": "1521578868"}},
                  "im:image": [
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/c2/51/4d/c2514d95-254b-4a84-9f7f-d471a046cb5e/mza_16436982274047367950.jpeg/55x55bb.png"},
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/c2/51/4d/c2514d95-254b-4a84-9f7f-d471a046cb5e/mza_16436982274047367950.jpeg/60x60bb.png"},
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/c2/51/4d/c2514d95-254b-4a84-9f7f-d471a046cb5e/mza_16436982274047367950.jpeg/170x170bb.png"}
                  ]
                },
                {
                  "title": {"label": "Morbid"},
                  "id": {"label": "https://podcasts.apple.com/us/podcast/morbid/id1379959217", "attributes": {"im:id": "1379959217"}},
                  "im:image": [
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/02/10/a6/0210a665-8302-cf9d-5193-86f2c419d145/mza_8920699161292361466.jpg/55x55bb.png"},
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/02/10/a6/0210a665-8302-cf9d-5193-86f2c419d145/mza_8920699161292361466.jpg/60x60bb.png"},
                    {"label": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/02/10/a6/0210a665-8302-cf9d-5193-86f2c419d145/mza_8920699161292361466.jpg/170x170bb.png"}
                  ]
                }
              ]
            }
          },
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
