'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

// Plugin to fetch top podcasts during build time and create a static JSON file
class TopPodcastsPlugin {
  constructor(options = {}) {
    // Default options
    this.options = {
      apiEndpoint: 'https://podr-svc-48579879001.us-west4.run.app/?q=toppodcasts&limit=10',
      outputFile: 'top-podcasts.json',
      fallbackData: { feed: { entry: [] } },
      ...options
    };
  }

  apply(compiler) {
    // Hook into the compilation process
    compiler.hooks.beforeRun.tapAsync('TopPodcastsPlugin', (compilation, callback) => {
      console.log('Fetching top podcasts at build time...');
      
      // Create a promise to fetch the data
      this.fetchTopPodcasts()
        .then(data => {
          const outputPath = path.resolve(compiler.options.output.path, this.options.outputFile);
          
          // Ensure the directory exists
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          
          // Write the data to the output file
          fs.writeFileSync(outputPath, JSON.stringify(data));
          
          console.log(`Top podcasts data written to ${outputPath}`);
          callback();
        })
        .catch(error => {
          console.error('Error fetching top podcasts:', error.message);
          
          // Write fallback data on error
          const outputPath = path.resolve(compiler.options.output.path, this.options.outputFile);
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, JSON.stringify(this.options.fallbackData));
          
          console.log('Using fallback data for top podcasts');
          callback();
        });
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