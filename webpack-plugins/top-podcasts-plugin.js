'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Plugin to fetch top podcasts during build time and create a static JSON file or inline as window variable
class TopPodcastsPlugin {
  constructor(options = {}) {
    // Default options
    this.options = {
      apiEndpoint: 'https://podr-svc-48579879001.us-west4.run.app/?q=toppodcasts&limit=10',
      outputFile: 'top-podcasts.json',
      fallbackData: { feed: { entry: [] } },
      production: true, // Whether to fetch data from API (production) or just use fallback (development)
      inlineAsVariable: true, // Whether to inline data as window variable (true) or just use JSON file (false)
      variableName: 'PODR_TOP_PODCASTS', // Name of the window variable to use when inlining
      ...options
    };
    
    // Store data for use in compilation
    this.data = null;
  }

  apply(compiler) {
    // Hook into the compilation process to fetch data
    compiler.hooks.beforeRun.tapAsync('TopPodcastsPlugin', (compilation, callback) => {
      const outputPath = path.resolve(compiler.options.output.path, this.options.outputFile);
      
      // Ensure the directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      
      // Function to process and save data
      const processData = (data) => {
        // Store data for use in HtmlWebpackPlugin hooks
        this.data = data;
        
        // Always write the JSON file for backward compatibility
        fs.writeFileSync(outputPath, JSON.stringify(data));
        
        console.log(`Top podcasts data written to ${outputPath}`);
        if (this.options.inlineAsVariable) {
          console.log(`Top podcasts data will be inlined as window.${this.options.variableName}`);
        }
        callback();
      };
      
      // Only fetch from API in production mode
      if (this.options.production) {
        console.log('Fetching top podcasts at build time...');
        
        // Create a promise to fetch the data
        this.fetchTopPodcasts()
          .then(data => {
            processData(data);
          })
          .catch(error => {
            console.error('Error fetching top podcasts:', error.message);
            
            // Use fallback data on error
            processData(this.options.fallbackData);
            
            console.log('Using fallback data for top podcasts');
          });
      } else {
        // In development mode, just use fallback data
        console.log('Development mode: Using fallback data for top podcasts');
        processData(this.options.fallbackData);
      }
    });
    
    // Hook into HtmlWebpackPlugin to inject the window variable if enabled
    compiler.hooks.compilation.tap('TopPodcastsPlugin', (compilation) => {
      if (this.options.inlineAsVariable) {
        // Get HtmlWebpackPlugin hooks
        const hooks = HtmlWebpackPlugin.getHooks(compilation);
        
        // Hook into the HTML generation process
        hooks.beforeEmit.tapAsync('TopPodcastsPlugin', (data, callback) => {
          const variableData = this.data || this.options.fallbackData;
          const scriptContent = `window.${this.options.variableName} = ${JSON.stringify(variableData)};`;
          
          // Create a script tag with the data
          const scriptTag = `<script>${scriptContent}</script>`;
          
          // Inject the script tag before the closing head tag
          data.html = data.html.replace('</head>', `${scriptTag}\n</head>`);
          
          callback(null, data);
        });
      }
    });
  }

  fetchTopPodcasts() {
    return new Promise((resolve, reject) => {
      https.get(this.options.apiEndpoint, (res) => {
        let data = '';
        
        // Handle HTTP status code errors
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP request failed with status code ${res.statusCode}`));
          return;
        }
        
        // Collect data chunks
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        // Process the data when complete
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (e) {
            reject(new Error(`Failed to parse response data: ${e.message}`));
          }
        });
      }).on('error', (e) => {
        reject(new Error(`HTTP request error: ${e.message}`));
      });
    });
  }
}

module.exports = TopPodcastsPlugin;