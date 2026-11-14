'use strict';

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { ApiInlinerPlugin } = require('./packages/webpack-api-inliner-plugin');
const { CONSENT_REGIONS, resolveAdsConfig } = require('./config/ads');
const { resolveAnalyticsConfig } = require('./config/analytics');
const { resolveApiConfig } = require('./config/api');
const { SitemapPlugin } = require('./config/sitemap');
const { resolveSiteConfig } = require('./config/site');
const fallbackTopPodcasts = require('./config/top-podcasts-fallback');
const CopyAssetsPlugin = require('./webpack-plugins/copy-assets-plugin');
const TopPodcastsPlugin = require('./webpack-plugins/top-podcasts-plugin'); // Keep for backward compatibility

/**
 * If the "--production" command-line parameter is specified when invoking Heft, then the
 * "production" function parameter will be true.  You can use this to enable bundling optimizations.
 */
function createWebpackConfig({ production }) {
  // Analytics is opt-in per deployment: an unconfigured build injects no
  // third-party script and reports nothing. See config/analytics.js.
  const analytics = resolveAnalyticsConfig();
  const api = resolveApiConfig();
  const site = resolveSiteConfig();
  const ads = resolveAdsConfig();

  if (analytics.provider !== 'none') {
    console.log(
      `[podr] analytics provider: ${analytics.provider} ` +
        `(Content-Security-Policy must allow ${analytics.origins.join(' ')})`
    );
  }

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
      app: path.join(__dirname, 'lib', 'index.js')
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
    // Add optimization settings for production
    optimization: {
      minimize: production,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_console: production,
              drop_debugger: production
            },
            output: {
              comments: false
            }
          },
          extractComments: false
        }),
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
                mergeLonghand: true,
                cssDeclarationSorter: true
              }
            ]
          }
        })
      ],
      splitChunks: production ? {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        automaticNameDelimiter: '~',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      } : false
    },
    plugins: [
      new webpack.DefinePlugin({
        // Which analytics provider trackEvent dispatches to. Paired with the
        // script tag injected into the HTML template below.
        PODR_ANALYTICS_PROVIDER: JSON.stringify(analytics.provider),
        PODR_API_BASE_URL: JSON.stringify(api.baseUrl)
      }),
      // The manifest, its icons, the service worker, and ads.txt are fetched by
      // URL, so they have to be emitted rather than imported
      new CopyAssetsPlugin({
        from: 'assets',
        injectManifestInto: 'sw.js',
        apiHost: new URL(api.baseUrl).hostname,
        files: [
          'sw.js',
          'site.webmanifest',
          'android-chrome-192x192.png',
          'android-chrome-512x512.png',
          'maskable-icon-512x512.png',
          'apple-touch-icon.png',
          'favicon-16x16.png',
          'favicon-32x32.png',
          // Open Graph / Twitter card image, 1200x630
          'og-image.png',
          // Read by ad exchanges at the site root; see assets/ads.txt
          'ads.txt'
        ],
        // Replaces the ads.txt placeholder when PODR_ADSENSE_PUBLISHER_ID is set
        publisherId: ads.publisherId
      }),
      // robots.txt and sitemap.xml. Generated rather than copied so the podcast
      // pages follow the top-podcasts list fetched for this build.
      new SitemapPlugin({
        production,
        origin: site.origin,
        topPodcastsUrl: api.topPodcastsUrl,
        fallbackData: fallbackTopPodcasts
      }),
      new HtmlWebpackPlugin({
        template: 'assets/index.html',
        favicon: 'assets/favicon.ico',
        // Consumed by assets/index.html. Empty for an unconfigured build, which
        // is what keeps a default Podr build free of third-party requests.
        analyticsSnippet: analytics.snippet,
        // Google Consent Mode defaults ship only alongside gtag
        analyticsProvider: analytics.provider,
        // Canonical, Open Graph and JSON-LD URLs (PODR_SITE_ORIGIN, config/site.js)
        siteOrigin: site.origin,
        // Loads the Funding Choices consent prompt when set
        adsPublisherId: ads.publisherId,
        consentRegions: CONSENT_REGIONS,
        minify: production ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true
        } : false
      }),
      ...(production ? [new MiniCssExtractPlugin({
        filename: '[name]_[contenthash].css'
      })] : []),
      ...(production ? [new CompressionPlugin({
        filename: '[path][base].gz',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 10240, // Only compress assets bigger than 10kb
        minRatio: 0.8 // Only compress assets that compress better than 80%
      })] : []),
      require('autoprefixer'),  // Automatically add vendor prefixes for cross-browser compatibility
      
      // Use the API Inliner plugin
      // This would typically be configured through a separate config file
      // when using the Heft plugin integration
      new ApiInlinerPlugin({
        // Production flag controls whether to fetch from API or use fallback data
        production: production,
        // Only fetch from API in production, use fallback data in development
        alwaysFetchFromApi: false,
        inlineAsVariable: true,
        emitDeclarationFile: true, // Generate TypeScript declaration file
        declarationFilePath: 'api-inliner.d.ts', // Path relative to output directory
        endpoints: [{
          url: api.topPodcastsUrl,
          outputFile: 'top-podcasts.json',
          fallbackData: fallbackTopPodcasts,
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
