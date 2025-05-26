'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const url = require('url');

// Conditionally load HtmlWebpackPlugin (makes it an optional peer dependency)
let HtmlWebpackPlugin;
try {
  HtmlWebpackPlugin = require('html-webpack-plugin');
} catch (e) {
  // HtmlWebpackPlugin is optional - inlining as window variables won't work without it
  console.warn('ApiInlinerPlugin: html-webpack-plugin not found, window variable inlining will be disabled.');
}

/**
 * ApiInlinerPlugin - A webpack plugin to fetch API data during build time and inline or save to static files
 * This plugin can be used to pre-fetch critical API responses at build time and make them available to your app
 * either as static JSON files or as window variables for faster initial load.
 */
class ApiInlinerPlugin {
  /**
   * @typedef {Object} EndpointConfig
   * @property {string} url - The API endpoint URL to fetch data from
   * @property {string} outputFile - The filename to save the fetched data to (if saveAsFile is true)
   * @property {Object} fallbackData - The fallback data to use if the API request fails or in development mode
   * @property {boolean} [inlineAsVariable=false] - Whether to inline data as window variable
   * @property {string} [variableName] - Name of the window variable to use when inlining
   * @property {Object} [requestOptions] - Options to pass to the http/https request (headers, method, etc)
   */

  /**
   * @typedef {Object} ApiInlinerOptions
   * @property {EndpointConfig|EndpointConfig[]} endpoints - Single endpoint or array of endpoint configurations
   * @property {boolean} [production=true] - Whether to fetch data from API (production) or just use fallback (development)
   * @property {boolean} [inlineAsVariable=true] - Global setting for whether to inline data as window variables
   * @property {string} [variablePrefix='API_DATA'] - Prefix for all window variables when auto-generating names
   * @property {boolean} [saveAsFile=true] - Whether to save data as static JSON files
   * @property {number} [requestTimeout=10000] - Timeout in milliseconds for API requests
   * @property {number} [retryCount=2] - Number of times to retry a failed request
   * @property {string} [outputPath] - Custom path to save JSON files to (relative to webpack output path)
   * @property {function} [onSuccess] - Callback function to run after successful data fetch (receives data and endpoint)
   * @property {function} [onError] - Callback function to run after failed data fetch (receives error and endpoint)
   */

  /**
   * Create a new ApiInlinerPlugin instance
   * @param {ApiInlinerOptions} options - Plugin options
   */
  constructor(options = {}) {
    // Default options
    this.options = {
      endpoints: [],
      production: true,
      inlineAsVariable: true,
      variablePrefix: 'API_DATA',
      saveAsFile: true,
      requestTimeout: 10000,
      retryCount: 2,
      outputPath: '',
      ...options
    };

    // Normalize endpoints to always be an array
    if (!Array.isArray(this.options.endpoints)) {
      this.options.endpoints = [this.options.endpoints];
    }

    // Initialize data store for all endpoints
    this.dataStore = {};
  }

  apply(compiler) {
    // Get the output path from webpack config
    const webpackOutputPath = compiler.options.output.path;

    // Hook into the compilation process to fetch data
    compiler.hooks.beforeRun.tapAsync('ApiInlinerPlugin', async (compilation, callback) => {
      if (this.options.endpoints.length === 0) {
        console.log('ApiInlinerPlugin: No endpoints configured, skipping data fetch');
        return callback();
      }

      try {
        // Process all endpoints (in parallel)
        const fetchPromises = this.options.endpoints.map(endpoint => 
          this.processEndpoint(endpoint, webpackOutputPath)
        );

        await Promise.all(fetchPromises);
        callback();
      } catch (error) {
        console.error('ApiInlinerPlugin: Error processing endpoints:', error);
        callback();
      }
    });

    // Hook into HtmlWebpackPlugin to inject the window variables if enabled
    compiler.hooks.compilation.tap('ApiInlinerPlugin', (compilation) => {
      // Skip if HtmlWebpackPlugin is not available
      if (!HtmlWebpackPlugin) {
        console.warn('ApiInlinerPlugin: html-webpack-plugin not found, window variable inlining disabled.');
        return;
      }
      
      // Get HtmlWebpackPlugin hooks
      const hooks = HtmlWebpackPlugin.getHooks(compilation);
      
      // Hook into the HTML generation process
      hooks.beforeEmit.tapAsync('ApiInlinerPlugin', (data, callback) => {
        // Generate script content for all endpoints that should be inlined
        const scriptTags = [];
        
        this.options.endpoints.forEach(endpoint => {
          // Skip if endpoint is not configured to be inlined
          const shouldInline = endpoint.inlineAsVariable ?? this.options.inlineAsVariable;
          if (!shouldInline) return;
          
          const variableName = endpoint.variableName || 
            `${this.options.variablePrefix}_${this.getVariableNameFromUrl(endpoint.url)}`;

          // If we have data for this endpoint in our store, create a script tag
          if (this.dataStore[endpoint.url]) {
            const scriptContent = `window.${variableName} = ${JSON.stringify(this.dataStore[endpoint.url])};`;
            scriptTags.push(`<script>${scriptContent}</script>`);
          }
        });
        
        // Inject all script tags before the closing head tag
        if (scriptTags.length > 0) {
          data.html = data.html.replace('</head>', `${scriptTags.join('\n')}\n</head>`);
        }
        
        callback(null, data);
      });
    });
  }

  /**
   * Process a single endpoint configuration
   * @param {EndpointConfig} endpoint - Endpoint configuration
   * @param {string} webpackOutputPath - Webpack output path
   * @returns {Promise<void>}
   */
  async processEndpoint(endpoint, webpackOutputPath) {
    const shouldFetchFromApi = this.options.production;
    const shouldSaveAsFile = endpoint.saveAsFile ?? this.options.saveAsFile;
    
    // Generate output path for this endpoint
    let outputPath;
    if (shouldSaveAsFile) {
      outputPath = path.resolve(
        webpackOutputPath, 
        this.options.outputPath, 
        endpoint.outputFile
      );
      
      // Ensure the output directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    // Generate variable name from endpoint URL if not specified
    const variableName = endpoint.variableName || 
      `${this.options.variablePrefix}_${this.getVariableNameFromUrl(endpoint.url)}`;

    // Log what we're doing
    if (shouldFetchFromApi) {
      console.log(`ApiInlinerPlugin: Fetching data from ${endpoint.url}`);
    } else {
      console.log(`ApiInlinerPlugin: Development mode - Using fallback data for ${endpoint.url}`);
    }

    // Function to process and save data
    const processData = (data) => {
      // Store data for later use in HtmlWebpackPlugin hooks
      this.dataStore[endpoint.url] = data;
      
      // Save to file if configured
      if (shouldSaveAsFile) {
        fs.writeFileSync(outputPath, JSON.stringify(data));
        console.log(`ApiInlinerPlugin: Data written to ${outputPath}`);
      }
      
      // Log if inlining as variable
      const shouldInline = endpoint.inlineAsVariable ?? this.options.inlineAsVariable;
      if (shouldInline) {
        console.log(`ApiInlinerPlugin: Data will be inlined as window.${variableName}`);
      }
      
      // Call onSuccess callback if provided
      if (typeof this.options.onSuccess === 'function') {
        this.options.onSuccess(data, endpoint);
      }
    };

    // Only fetch from API in production mode
    if (shouldFetchFromApi) {
      try {
        // Fetch data from API with retry mechanism
        const data = await this.fetchFromApi(
          endpoint.url, 
          endpoint.requestOptions,
          this.options.requestTimeout,
          this.options.retryCount
        );
        processData(data);
      } catch (error) {
        console.error(`ApiInlinerPlugin: Error fetching from ${endpoint.url}:`, error.message);
        
        // Use fallback data on error
        processData(endpoint.fallbackData);
        console.log(`ApiInlinerPlugin: Using fallback data for ${endpoint.url}`);
        
        // Call onError callback if provided
        if (typeof this.options.onError === 'function') {
          this.options.onError(error, endpoint);
        }
      }
    } else {
      // In development mode, just use fallback data
      processData(endpoint.fallbackData);
    }
  }

  /**
   * Fetch data from an API endpoint with retry mechanism
   * @param {string} apiUrl - The URL to fetch data from
   * @param {Object} requestOptions - Options to pass to the request
   * @param {number} timeout - Request timeout in milliseconds
   * @param {number} retries - Number of retries on failure
   * @returns {Promise<Object>} The parsed JSON data
   */
  fetchFromApi(apiUrl, requestOptions = {}, timeout = 10000, retries = 2) {
    return new Promise((resolve, reject) => {
      const parsedUrl = url.parse(apiUrl);
      const httpModule = parsedUrl.protocol === 'https:' ? https : http;
      
      // Setup request options
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: 'GET',
        timeout,
        ...requestOptions
      };
      
      // Create request with error handling and retry logic
      const makeRequest = (retriesLeft) => {
        const req = httpModule.request(options, (res) => {
          let data = '';
          
          // Handle HTTP status code errors
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const error = new Error(`HTTP request failed with status code ${res.statusCode}`);
            
            // Retry on 5xx errors if we have retries left
            if (res.statusCode >= 500 && retriesLeft > 0) {
              console.log(`ApiInlinerPlugin: Retrying ${apiUrl} due to ${res.statusCode} error (${retriesLeft} attempts left)`);
              return makeRequest(retriesLeft - 1);
            }
            
            return reject(error);
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
        });
        
        // Handle request errors
        req.on('error', (e) => {
          if (retriesLeft > 0) {
            console.log(`ApiInlinerPlugin: Retrying ${apiUrl} due to error: ${e.message} (${retriesLeft} attempts left)`);
            return makeRequest(retriesLeft - 1);
          }
          reject(new Error(`HTTP request error: ${e.message}`));
        });
        
        // Handle timeout
        req.on('timeout', () => {
          req.destroy();
          if (retriesLeft > 0) {
            console.log(`ApiInlinerPlugin: Retrying ${apiUrl} due to timeout (${retriesLeft} attempts left)`);
            return makeRequest(retriesLeft - 1);
          }
          reject(new Error(`HTTP request timeout after ${timeout}ms`));
        });
        
        // End the request
        req.end();
      };
      
      // Start the initial request
      makeRequest(retries);
    });
  }

  /**
   * Generate a safe variable name from a URL
   * @param {string} apiUrl - The API URL
   * @returns {string} A safe variable name
   */
  getVariableNameFromUrl(apiUrl) {
    const parsedUrl = url.parse(apiUrl);
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    
    // Use the last segment of the path, or hostname if path is empty
    const baseSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : parsedUrl.hostname;
    
    // Replace non-alphanumeric characters with underscores and convert to uppercase
    const safeName = baseSegment
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .toUpperCase();
    
    return safeName;
  }
}

module.exports = ApiInlinerPlugin;