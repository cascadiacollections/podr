/**
 * Rush Stack API Inliner Plugin
 * 
 * A webpack plugin that fetches API data during build time and inlines it or saves it to static files.
 * Compatible with RushStack/Heft build system and follows Rush Stack design patterns.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { Compiler, Compilation } from 'webpack';

import {
  IApiInlinerConfiguration,
  IEndpointConfig,
  IApiInlinerPlugin,
  ApiDataStore,
  IApiDataStoreEntry
} from './interfaces';

// Try to load HtmlWebpackPlugin (optional peer dependency)
let HtmlWebpackPlugin: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  HtmlWebpackPlugin = require('html-webpack-plugin');
} catch (e) {
  // HtmlWebpackPlugin is optional - inlining as window variables won't work without it
  console.warn('ApiInlinerPlugin: html-webpack-plugin not found, window variable inlining will be disabled.');
}

/**
 * Default configuration values for the API Inliner Plugin
 * These match the defaults defined in schema.json
 */
const DEFAULT_CONFIG: Partial<IApiInlinerConfiguration> = {
  production: true,
  inlineAsVariable: true,
  variablePrefix: 'API_DATA',
  saveAsFile: true,
  requestTimeout: 10000,
  retryCount: 2,
  outputPath: '',
  emitDeclarationFile: false,
  declarationFilePath: 'api-inliner.d.ts',
  defaultType: 'any'
};

/**
 * ApiInlinerPlugin for RushStack/Heft
 * 
 * This plugin fetches API data during build time and makes it available to your app
 * either as static JSON files or as inline window variables.
 */
export class ApiInlinerPlugin implements IApiInlinerPlugin {
  private readonly options: IApiInlinerConfiguration;
  private readonly dataStore: ApiDataStore;

  /**
   * Create a new ApiInlinerPlugin instance
   * @param options - Plugin configuration
   */
  public constructor(options: IApiInlinerConfiguration) {
    // Merge with default options
    this.options = {
      ...DEFAULT_CONFIG,
      ...options,
      // Ensure endpoints is always an array
      endpoints: Array.isArray(options.endpoints) ? options.endpoints : [options.endpoints]
    };

    // Initialize data store for all endpoints
    this.dataStore = new Map<string, IApiDataStoreEntry>();
  }

  /**
   * Apply the plugin to the webpack compiler
   * @param compiler - The webpack compiler
   */
  public apply(compiler: Compiler): void {
    // Get the output path from webpack config
    const webpackOutputPath: string = compiler.options.output.path || '';

    // Track if we're running in watch mode
    let isWatchMode: boolean = false;

    // Hook into watch mode detection
    compiler.hooks.watchRun.tap('ApiInlinerPlugin', () => {
      isWatchMode = true;
    });

    // Fetch data before compilation starts
    compiler.hooks.beforeRun.tapAsync('ApiInlinerPlugin', async (compilation, callback) => {
      if (this.options.endpoints.length === 0) {
        console.log('ApiInlinerPlugin: No endpoints configured, skipping data fetch');
        return callback();
      }

      try {
        // Process all endpoints (in parallel)
        const fetchPromises: Promise<void>[] = this.options.endpoints.map((endpoint) =>
          this.processEndpoint(endpoint, webpackOutputPath)
        );

        await Promise.all(fetchPromises);
        callback();
      } catch (error) {
        console.error('ApiInlinerPlugin: Error processing endpoints:', error);
        callback();
      }
    });

    // Also hook into the watch mode to update data when rebuilding
    compiler.hooks.watchRun.tapAsync('ApiInlinerPlugin', async (compilation, callback) => {
      if (this.options.endpoints.length === 0) {
        return callback();
      }

      try {
        // In watch mode, we might want to use cached data or re-fetch
        // For now, we'll just re-fetch each time, but this could be optimized
        const fetchPromises: Promise<void>[] = this.options.endpoints.map((endpoint) =>
          this.processEndpoint(endpoint, webpackOutputPath)
        );

        await Promise.all(fetchPromises);
        callback();
      } catch (error) {
        console.error('ApiInlinerPlugin: Error processing endpoints in watch mode:', error);
        callback();
      }
    });

    // Hook into HtmlWebpackPlugin to inject the window variables if enabled
    if (HtmlWebpackPlugin) {
      compiler.hooks.compilation.tap('ApiInlinerPlugin', (compilation: Compilation) => {
        // Get HtmlWebpackPlugin hooks
        const hooks = HtmlWebpackPlugin.getHooks(compilation);
        
        // Hook into the HTML generation process
        hooks.beforeEmit.tapAsync('ApiInlinerPlugin', (data: any, callback: (error: Error | null, data: any) => void) => {
          // Generate script content for all endpoints that should be inlined
          const scriptTags: string[] = [];
          
          this.dataStore.forEach((entry: IApiDataStoreEntry, url: string) => {
            const endpoint: IEndpointConfig = entry.endpoint;
            // Skip if endpoint is not configured to be inlined
            const shouldInline: boolean = endpoint.inlineAsVariable ?? this.options.inlineAsVariable ?? DEFAULT_CONFIG.inlineAsVariable as boolean;
            if (!shouldInline) return;
            
            const variableName: string = endpoint.variableName || 
              `${this.options.variablePrefix}_${this.getVariableNameFromUrl(endpoint.url)}`;

            // Create a script tag with the data
            const scriptContent: string = `window.${variableName} = ${JSON.stringify(entry.data)};`;
            scriptTags.push(`<script>${scriptContent}</script>`);
          });
          
          // Inject all script tags before the closing head tag
          if (scriptTags.length > 0) {
            data.html = data.html.replace('</head>', `${scriptTags.join('\n')}\n</head>`);
          }
          
          callback(null, data);
        });
      });
    }

    // After the emit phase, generate the TypeScript declaration file if enabled
    compiler.hooks.afterEmit.tapAsync('ApiInlinerPlugin', (compilation: Compilation, callback: () => void) => {
      if (this.options.emitDeclarationFile && this.dataStore.size > 0) {
        this.generateDeclarationFile(webpackOutputPath);
      }
      
      callback();
    });
  }

  /**
   * Process a single endpoint configuration
   * @param endpoint - Endpoint configuration
   * @param webpackOutputPath - Webpack output path
   * @returns Promise that resolves when the endpoint is processed
   */
  private async processEndpoint(endpoint: IEndpointConfig, webpackOutputPath: string): Promise<void> {
    const shouldFetchFromApi: boolean = this.options.production as boolean;
    const shouldSaveAsFile: boolean = endpoint.saveAsFile ?? this.options.saveAsFile ?? DEFAULT_CONFIG.saveAsFile as boolean;
    
    // Generate output path for this endpoint
    let outputPath: string | undefined;
    if (shouldSaveAsFile && endpoint.outputFile) {
      outputPath = path.resolve(
        webpackOutputPath, 
        this.options.outputPath as string, 
        endpoint.outputFile
      );
      
      // Ensure the output directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    // Generate variable name from endpoint URL if not specified
    const variableName: string = endpoint.variableName || 
      `${this.options.variablePrefix}_${this.getVariableNameFromUrl(endpoint.url)}`;

    // Log what we're doing
    if (shouldFetchFromApi) {
      console.log(`ApiInlinerPlugin: Fetching data from ${endpoint.url}`);
    } else {
      console.log(`ApiInlinerPlugin: Development mode - Using fallback data for ${endpoint.url}`);
    }

    // Function to process and save data
    const processData = (data: any): void => {
      // Store data for later use in HtmlWebpackPlugin hooks
      this.dataStore.set(endpoint.url, { data, endpoint });
      
      // Save to file if configured
      if (shouldSaveAsFile && outputPath) {
        fs.writeFileSync(outputPath, JSON.stringify(data));
        console.log(`ApiInlinerPlugin: Data written to ${outputPath}`);
      }
      
      // Log if inlining as variable
      const shouldInline: boolean = endpoint.inlineAsVariable ?? this.options.inlineAsVariable ?? DEFAULT_CONFIG.inlineAsVariable as boolean;
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
        const data: any = await this.fetchFromApi(
          endpoint.url, 
          endpoint.requestOptions,
          this.options.requestTimeout,
          this.options.retryCount
        );
        processData(data);
      } catch (error) {
        console.error(`ApiInlinerPlugin: Error fetching from ${endpoint.url}:`, (error as Error).message);
        
        // Use fallback data on error
        if (endpoint.fallbackData) {
          processData(endpoint.fallbackData);
          console.log(`ApiInlinerPlugin: Using fallback data for ${endpoint.url}`);
        } else {
          console.warn(`ApiInlinerPlugin: No fallback data provided for ${endpoint.url}`);
          processData({});
        }
        
        // Call onError callback if provided
        if (typeof this.options.onError === 'function') {
          this.options.onError(error as Error, endpoint);
        }
      }
    } else {
      // In development mode, just use fallback data
      processData(endpoint.fallbackData || {});
    }
  }

  /**
   * Generate TypeScript declaration file for window variables
   * @param webpackOutputPath - Webpack output directory path
   */
  private generateDeclarationFile(webpackOutputPath: string): void {
    if (this.dataStore.size === 0) {
      console.log('ApiInlinerPlugin: No data to generate TypeScript declarations for');
      return;
    }
    
    // Get declaration file path
    const declarationFilePath: string = path.resolve(
      webpackOutputPath,
      this.options.declarationFilePath as string
    );

    // Create directory if it doesn't exist
    fs.mkdirSync(path.dirname(declarationFilePath), { recursive: true });
    
    // Start building the declaration file content
    let declarationContent: string = `/**
 * Auto-generated TypeScript declarations for API Inliner Plugin
 * Generated on: ${new Date().toISOString()}
 * DO NOT EDIT DIRECTLY
 */

declare global {
  interface Window {\n`;

    // Add each window variable
    this.dataStore.forEach((entry: IApiDataStoreEntry) => {
      const endpoint: IEndpointConfig = entry.endpoint;
      const shouldInline: boolean = endpoint.inlineAsVariable ?? this.options.inlineAsVariable ?? DEFAULT_CONFIG.inlineAsVariable as boolean;
      
      if (shouldInline) {
        const variableName: string = endpoint.variableName || 
          `${this.options.variablePrefix}_${this.getVariableNameFromUrl(endpoint.url)}`;
        
        // Use custom type reference if provided, otherwise use default
        const typeRef: string = endpoint.typeReference || this.options.defaultType || 'any';
        
        declarationContent += `    ${variableName}: ${typeRef};\n`;
      }
    });

    // Close the declaration
    declarationContent += `  }
}

export {}; // This file is a module
`;

    // Write to file
    fs.writeFileSync(declarationFilePath, declarationContent);
    console.log(`ApiInlinerPlugin: TypeScript declarations generated at ${declarationFilePath}`);
  }

  /**
   * Fetch data from an API endpoint with retry mechanism
   * @param apiUrl - The URL to fetch data from
   * @param requestOptions - Options to pass to the request
   * @param timeout - Request timeout in milliseconds
   * @param retries - Number of retries on failure
   * @returns Promise that resolves with the parsed JSON data
   */
  private fetchFromApi(
    apiUrl: string, 
    requestOptions: Record<string, unknown> = {}, 
    timeout: number = DEFAULT_CONFIG.requestTimeout as number, 
    retries: number = DEFAULT_CONFIG.retryCount as number
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const parsedUrl: URL = new URL(apiUrl);
      const httpModule: typeof http | typeof https = parsedUrl.protocol === 'https:' ? https : http;
      
      // Setup request options
      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: 'GET',
        timeout,
        ...requestOptions
      };
      
      // Create request with error handling and retry logic
      const makeRequest = (retriesLeft: number): void => {
        const req: http.ClientRequest = httpModule.request(options, (res: http.IncomingMessage) => {
          let data: string = '';
          
          // Handle HTTP status code errors
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            const error: Error = new Error(`HTTP request failed with status code ${res.statusCode}`);
            
            // Retry on 5xx errors if we have retries left
            if (res.statusCode >= 500 && retriesLeft > 0) {
              console.log(`ApiInlinerPlugin: Retrying ${apiUrl} due to ${res.statusCode} error (${retriesLeft} attempts left)`);
              return makeRequest(retriesLeft - 1);
            }
            
            return reject(error);
          }
          
          // Collect data chunks
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          
          // Process the data when complete
          res.on('end', () => {
            try {
              const parsedData: any = JSON.parse(data);
              resolve(parsedData);
            } catch (e) {
              reject(new Error(`Failed to parse response data: ${(e as Error).message}`));
            }
          });
        });
        
        // Handle request errors
        req.on('error', (e: Error) => {
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
   * @param apiUrl - The API URL
   * @returns A safe variable name
   */
  private getVariableNameFromUrl(apiUrl: string): string {
    const parsedUrl: URL = new URL(apiUrl);
    const pathSegments: string[] = parsedUrl.pathname.split('/').filter(Boolean);
    
    // Use the last segment of the path, or hostname if path is empty
    const baseSegment: string = pathSegments.length > 0 
      ? pathSegments[pathSegments.length - 1] 
      : parsedUrl.hostname;
    
    // Replace non-alphanumeric characters with underscores and convert to uppercase
    const safeName: string = baseSegment
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .toUpperCase();
    
    return safeName;
  }
}

export default ApiInlinerPlugin;

// Also re-export interfaces for consumers
export * from './interfaces';