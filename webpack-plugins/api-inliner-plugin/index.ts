/**
 * Rush Stack API Inliner Plugin
 * 
 * A webpack plugin that fetches API data during build time and inlines it or saves it to static files.
 * Compatible with RushStack/Heft build system and follows Rush Stack design patterns.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  production: process.env.NODE_ENV === 'production',
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
    compiler.hooks.afterEmit.tapAsync('ApiInlinerPlugin', async (compilation: Compilation, callback: () => void) => {
      if (this.options.emitDeclarationFile && this.dataStore.size > 0) {
        await this.generateDeclarationFile(webpackOutputPath);
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
    const shouldFetchFromApi: boolean = endpoint.production ?? this.options.production ?? DEFAULT_CONFIG.production as boolean;
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
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
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
    const processData = async (data: any): Promise<void> => {
      // Store data for later use in HtmlWebpackPlugin hooks
      this.dataStore.set(endpoint.url, { data, endpoint });
      
      // Save to file if configured
      if (shouldSaveAsFile && outputPath) {
        await fs.writeFile(outputPath, JSON.stringify(data));
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
        // Fetch data from API using modern fetch API
        const data: any = await this.fetchFromApi(
          endpoint.url, 
          endpoint.requestOptions,
          this.options.requestTimeout,
          this.options.retryCount
        );
        await processData(data);
      } catch (error) {
        console.error(`ApiInlinerPlugin: Error fetching from ${endpoint.url}:`, (error as Error).message);
        
        // Use fallback data on error
        if (endpoint.fallbackData) {
          await processData(endpoint.fallbackData);
          console.log(`ApiInlinerPlugin: Using fallback data for ${endpoint.url}`);
        } else {
          console.warn(`ApiInlinerPlugin: No fallback data provided for ${endpoint.url}`);
          await processData({});
        }
        
        // Call onError callback if provided
        if (typeof this.options.onError === 'function') {
          this.options.onError(error as Error, endpoint);
        }
      }
    } else {
      // In development mode, just use fallback data
      await processData(endpoint.fallbackData || {});
    }
  }

  /**
   * Generate TypeScript declaration file for window variables
   * @param webpackOutputPath - Webpack output directory path
   */
  private async generateDeclarationFile(webpackOutputPath: string): Promise<void> {
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
    await fs.mkdir(path.dirname(declarationFilePath), { recursive: true });
    
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
    await fs.writeFile(declarationFilePath, declarationContent);
    console.log(`ApiInlinerPlugin: TypeScript declarations generated at ${declarationFilePath}`);
  }

  /**
   * Fetch data from an API endpoint with retry mechanism using native fetch API
   * @param apiUrl - The URL to fetch data from
   * @param requestOptions - Options to pass to the fetch API
   * @param timeout - Request timeout in milliseconds
   * @param retries - Number of retries on failure
   * @returns Promise that resolves with the parsed JSON data
   */
  private async fetchFromApi(
    apiUrl: string, 
    requestOptions: Record<string, unknown> = {}, 
    timeout: number = DEFAULT_CONFIG.requestTimeout as number, 
    retries: number = DEFAULT_CONFIG.retryCount as number
  ): Promise<any> {
    // Convert legacy http request options to fetch options
    const fetchOptions: RequestInit = {
      method: 'GET',
      ...requestOptions,
      headers: {
        'Accept': 'application/json',
        ...((requestOptions as any).headers || {})
      },
      signal: AbortSignal.timeout(timeout)
    };
    
    // Function to attempt the fetch with retries
    const fetchWithRetry = async (retriesLeft: number): Promise<any> => {
      try {
        const response = await fetch(apiUrl, fetchOptions);
        
        // Handle HTTP error responses
        if (!response.ok) {
          const error = new Error(`HTTP request failed with status code ${response.status}`);
          
          // Retry on 5xx errors if we have retries left
          if (response.status >= 500 && retriesLeft > 0) {
            console.log(`ApiInlinerPlugin: Retrying ${apiUrl} due to ${response.status} error (${retriesLeft} attempts left)`);
            return fetchWithRetry(retriesLeft - 1);
          }
          
          throw error;
        }
        
        // Parse JSON response
        return await response.json();
        
      } catch (error) {
        // Handle network errors and retries
        if (retriesLeft > 0 && !(error instanceof SyntaxError)) {
          console.log(`ApiInlinerPlugin: Retrying ${apiUrl} due to error: ${(error as Error).message} (${retriesLeft} attempts left)`);
          return fetchWithRetry(retriesLeft - 1);
        }
        throw error;
      }
    };
    
    // Start with full retry count
    return fetchWithRetry(retries);
  }

  /**
   * Generate a safe variable name from a URL
   * @param apiUrl - The API URL
   * @returns A safe variable name
   */
  private getVariableNameFromUrl(apiUrl: string): string {
    try {
      const url = new URL(apiUrl);
      const pathSegments: string[] = url.pathname.split('/').filter(Boolean);
      
      // Use the last segment of the path, or hostname if path is empty
      const baseSegment: string = pathSegments.length > 0 
        ? pathSegments[pathSegments.length - 1] 
        : url.hostname;
      
      // Replace non-alphanumeric characters with underscores and convert to uppercase
      const safeName: string = baseSegment
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/^[0-9]/, '_$&')
        .toUpperCase();
      
      return safeName;
    } catch (e) {
      // Fallback if URL is invalid
      return apiUrl.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    }
  }
}

export default ApiInlinerPlugin;

// Also re-export interfaces for consumers
export * from './interfaces';