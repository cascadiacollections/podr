/**
 * Rush Stack API Inliner Plugin
 *
 * A webpack plugin that fetches API data during build time and inlines it or saves it to static files.
 * Compatible with RushStack/Heft build system and follows Rush Stack design patterns.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Compilation, Compiler } from 'webpack';

import type {
  IApiInlinerConfiguration,
  IApiInlinerPlugin,
  IEndpointConfig
} from './interfaces';

// Try to load HtmlWebpackPlugin (optional peer dependency)
let HtmlWebpackPlugin: unknown;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  HtmlWebpackPlugin = require('html-webpack-plugin');
} catch {
  // HtmlWebpackPlugin is optional - inlining as window variables won't work without it
  console.warn('ApiInlinerPlugin: html-webpack-plugin not found, window variable inlining will be disabled.');
}

/**
 * Default configuration values for the API Inliner Plugin
 * These match the defaults defined in schema.json
 */
const DEFAULT_CONFIG = {
  production: process.env.NODE_ENV === 'production',
  alwaysFetchFromApi: true, // Always fetch from API by default, regardless of environment
  inlineAsVariable: true,
  variablePrefix: 'API_DATA',
  saveAsFile: true,
  requestTimeout: 10_000,
  retryCount: 2,
  outputPath: '',
  emitDeclarationFile: false,
  declarationFilePath: 'api-inliner.d.ts',
  defaultType: 'any'
} as const satisfies Partial<IApiInlinerConfiguration>;

/**
 * Read-only data store entry for immutability
 */
type ReadonlyDataStoreEntry = Readonly<{
  readonly data: unknown;
  readonly endpoint: Readonly<IEndpointConfig>;
}>;

/**
 * Immutable data store type
 */
type ImmutableDataStore = ReadonlyMap<string, ReadonlyDataStoreEntry>;

/**
 * Plugin state interface for encapsulation
 */
interface PluginState {
  readonly options: Readonly<IApiInlinerConfiguration>;
  readonly dataStore: ImmutableDataStore;
}

/**
 * ApiInlinerPlugin for RushStack/Heft
 *
 * This plugin fetches API data during build time and makes it available to your app
 * either as static JSON files or as inline window variables.
 */
export class ApiInlinerPlugin implements IApiInlinerPlugin {
  readonly #state: PluginState;

  /**
   * Create a new ApiInlinerPlugin instance
   * @param options - Plugin configuration
   */
  public constructor(options: IApiInlinerConfiguration) {
    // Create immutable configuration with defaults
    const mergedOptions = this.#createImmutableConfig(options);

    // Initialize immutable state
    this.#state = Object.freeze({
      options: mergedOptions,
      dataStore: new Map<string, ReadonlyDataStoreEntry>()
    });
  }

  /**
   * Create immutable configuration with defaults applied
   */
  #createImmutableConfig(options: IApiInlinerConfiguration): Readonly<IApiInlinerConfiguration> {
    const endpoints = Array.isArray(options.endpoints)
      ? [...options.endpoints].map(endpoint => Object.freeze({ ...endpoint }))
      : (options.endpoints && typeof options.endpoints === 'object' && !Array.isArray(options.endpoints))
        ? [Object.freeze({ ...(options.endpoints as IEndpointConfig) })]
        : [];

    return Object.freeze({
      ...DEFAULT_CONFIG,
      ...options,
      endpoints
    });
  }

  /**
   * Apply the plugin to the webpack compiler
   * @param compiler - The webpack compiler
   */
  public apply(compiler: Compiler): void {
    // Get the output path from webpack config
    const webpackOutputPath = compiler.options.output.path ?? '';

    // Track if we're running in watch mode using a closure
    let isWatchMode = false;

    // Hook into watch mode detection
    compiler.hooks.watchRun.tap('ApiInlinerPlugin', () => {
      isWatchMode = true;
    });

    // Fetch data before compilation starts
    compiler.hooks.beforeRun.tapAsync('ApiInlinerPlugin', async (compilation, callback) => {
      if (this.#state.options.endpoints.length === 0) {
        console.log('ApiInlinerPlugin: No endpoints configured, skipping data fetch');
        return callback();
      }

      try {
        // Process all endpoints (in parallel) and update state immutably
        await this.#processAllEndpoints(webpackOutputPath);
        callback();
      } catch (error) {
        console.error('ApiInlinerPlugin: Error processing endpoints:', error);
        callback();
      }
    });

    // Also hook into the watch mode to update data when rebuilding
    compiler.hooks.watchRun.tapAsync('ApiInlinerPlugin', async (compilation, callback) => {
      if (this.#state.options.endpoints.length === 0) {
        return callback();
      }

      try {
        // In watch mode, we might want to use cached data or re-fetch
        // For now, we'll just re-fetch each time, but this could be optimized
        await this.#processAllEndpoints(webpackOutputPath);
        callback();
      } catch (error) {
        console.error('ApiInlinerPlugin: Error processing endpoints in watch mode:', error);
        callback();
      }
    });

    // Hook into HtmlWebpackPlugin to inject the window variables if enabled
    if (HtmlWebpackPlugin) {
      this.#setupHtmlWebpackPluginHooks(compiler);
    }

    // After the emit phase, generate the TypeScript declaration file if enabled
    compiler.hooks.afterEmit.tapAsync('ApiInlinerPlugin', async (compilation: Compilation, callback: () => void) => {
      if (this.#state.options.emitDeclarationFile && this.#state.dataStore.size > 0) {
        await this.#generateDeclarationFile(webpackOutputPath);
      }

      callback();
    });
  }

  /**
   * Setup HtmlWebpackPlugin hooks with proper typing
   */
  #setupHtmlWebpackPluginHooks(compiler: Compiler): void {
    compiler.hooks.compilation.tap('ApiInlinerPlugin', (compilation: Compilation) => {
      // Get HtmlWebpackPlugin hooks with proper typing
      const hooks = (HtmlWebpackPlugin as any)?.getHooks?.(compilation);

      if (!hooks) return;

      // Hook into the HTML generation process
      hooks.beforeEmit.tapAsync(
        'ApiInlinerPlugin',
        (data: { html: string }, callback: (error: Error | null, data: { html: string }) => void) => {
          const updatedData = this.#injectScriptTags(data);
          callback(null, updatedData);
        }
      );
    });
  }

  /**
   * Inject script tags into HTML data immutably
   */
  #injectScriptTags(data: { html: string }): { html: string } {
    // Generate script content for all endpoints that should be inlined
    const scriptTags = Array.from(this.#state.dataStore.entries())
      .filter(([, entry]) => this.#shouldInlineEndpoint(entry.endpoint))
      .map(([url, entry]) => this.#createScriptTag(entry));

    // Return new data object with injected scripts
    if (scriptTags.length === 0) {
      return data;
    }

    const injectedHtml = data.html.replace(
      '</head>',
      `${scriptTags.join('\n')}\n</head>`
    );

    return { ...data, html: injectedHtml };
  }

  /**
   * Create a script tag for an endpoint entry
   */
  #createScriptTag(entry: ReadonlyDataStoreEntry): string {
    const variableName = this.#getVariableName(entry.endpoint);
    const scriptContent = `window.${variableName} = ${JSON.stringify(entry.data)};`;
    return `<script>${scriptContent}</script>`;
  }

  /**
   * Check if an endpoint should be inlined
   */
  #shouldInlineEndpoint(endpoint: Readonly<IEndpointConfig>): boolean {
    return endpoint.inlineAsVariable ??
           this.#state.options.inlineAsVariable ??
           DEFAULT_CONFIG.inlineAsVariable;
  }

  /**
   * Process all endpoints and update data store immutably
   */
  async #processAllEndpoints(webpackOutputPath: string): Promise<void> {
    // Process all endpoints in parallel
    const endpointResults = await Promise.allSettled(
      (Array.isArray(this.#state.options.endpoints)
        ? this.#state.options.endpoints
        : [this.#state.options.endpoints]
      ).map(endpoint =>
        this.#processEndpoint(endpoint, webpackOutputPath)
      )
    );

    // Update data store immutably with successful results
    const newEntries = endpointResults
      .map((result, index) => ({
        result,
        endpoint: this.#state.options.endpoints[index]!
      }))
      .filter((item): item is { result: PromiseFulfilledResult<ReadonlyDataStoreEntry>; endpoint: Readonly<IEndpointConfig> } =>
        item.result.status === 'fulfilled'
      )
      .map(({ result, endpoint }) => [endpoint.url, result.value] as const);

    // Create new data store with updated entries
    for (const [url, entry] of newEntries) {
      (this.#state.dataStore as Map<string, ReadonlyDataStoreEntry>).set(url, entry);
    }
  }

  /**
   * Process a single endpoint configuration with immutable return
   */
  async #processEndpoint(
    endpoint: Readonly<IEndpointConfig>,
    webpackOutputPath: string
  ): Promise<ReadonlyDataStoreEntry> {
    const shouldFetchFromApi = this.#shouldFetchFromApi(endpoint);
    const shouldSaveAsFile = endpoint.saveAsFile ??
                           this.#state.options.saveAsFile ??
                           DEFAULT_CONFIG.saveAsFile;

    // Generate output path for this endpoint
    const outputPath = await this.#prepareOutputPath(endpoint, shouldSaveAsFile, webpackOutputPath);

    // Log what we're doing
    this.#logProcessingAction(endpoint, shouldFetchFromApi);

    // Get data either from API or fallback
    const data = await this.#fetchData(endpoint, shouldFetchFromApi);

    // Create immutable data store entry
    const entry: ReadonlyDataStoreEntry = Object.freeze({
      data,
      endpoint: Object.freeze({ ...endpoint })
    });

    // Process the data (save to file, log, call callbacks)
    await this.#processDataEntry(entry, outputPath, shouldSaveAsFile);

    return entry;
  }

  /**
   * Determine if we should fetch from API based on configuration
   */
  #shouldFetchFromApi(endpoint: Readonly<IEndpointConfig>): boolean {
    const alwaysFetchFromApi = endpoint.alwaysFetchFromApi ??
                              this.#state.options.alwaysFetchFromApi ??
                              true;

    const production = endpoint.production ??
                      this.#state.options.production ??
                      DEFAULT_CONFIG.production;

    return alwaysFetchFromApi || production;
  }

  /**
   * Prepare output path if file saving is enabled
   */
  async #prepareOutputPath(
    endpoint: Readonly<IEndpointConfig>,
    shouldSaveAsFile: boolean,
    webpackOutputPath: string
  ): Promise<string | undefined> {
    if (!shouldSaveAsFile || !endpoint.outputFile) {
      return undefined;
    }

    const outputPathBase = this.#state.options.outputPath ?? '';
    const outputPath = path.resolve(
      webpackOutputPath,
      outputPathBase,
      endpoint.outputFile
    );

    // Ensure the output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    return outputPath;
  }

  /**
   * Log processing action
   */
  #logProcessingAction(endpoint: Readonly<IEndpointConfig>, shouldFetchFromApi: boolean): void {
    if (shouldFetchFromApi) {
      console.log(`ApiInlinerPlugin: Fetching data from ${endpoint.url}`);
    } else {
      console.log(`ApiInlinerPlugin: Development mode - Using fallback data for ${endpoint.url}`);
    }
  }

  /**
   * Fetch data from API or use fallback
   */
  async #fetchData(endpoint: Readonly<IEndpointConfig>, shouldFetchFromApi: boolean): Promise<unknown> {
    if (!shouldFetchFromApi) {
      return endpoint.fallbackData ?? {};
    }

    try {
      return await this.#fetchFromApi(
        endpoint.url,
        endpoint.requestOptions ?? {},
        this.#state.options.requestTimeout,
        this.#state.options.retryCount
      );
    } catch (error) {
      console.error(`ApiInlinerPlugin: Error fetching from ${endpoint.url}:`, (error as Error).message);

      // Call onError callback if provided
      this.#state.options.onError?.(error as Error, endpoint);

      // Use fallback data on error
      if (endpoint.fallbackData !== undefined) {
        console.log(`ApiInlinerPlugin: Using fallback data for ${endpoint.url}`);
        return endpoint.fallbackData;
      }

      console.warn(`ApiInlinerPlugin: No fallback data provided for ${endpoint.url}`);
      return {};
    }
  }

  /**
   * Process data entry (save to file, log, call callbacks)
   */
  async #processDataEntry(
    entry: ReadonlyDataStoreEntry,
    outputPath: string | undefined,
    shouldSaveAsFile: boolean
  ): Promise<void> {
    // Save to file if configured
    if (shouldSaveAsFile && outputPath) {
      await fs.writeFile(outputPath, JSON.stringify(entry.data, null, 2));
      console.log(`ApiInlinerPlugin: Data written to ${outputPath}`);
    }

    // Log if inlining as variable
    if (this.#shouldInlineEndpoint(entry.endpoint)) {
      const variableName = this.#getVariableName(entry.endpoint);
      console.log(`ApiInlinerPlugin: Data will be inlined as window.${variableName}`);
    }

    // Call onSuccess callback if provided
    this.#state.options.onSuccess?.(entry.data, entry.endpoint);
  }

  /**
   * Get variable name for an endpoint
   */
  #getVariableName(endpoint: Readonly<IEndpointConfig>): string {
    return endpoint.variableName ??
           `${this.#state.options.variablePrefix}_${this.#getVariableNameFromUrl(endpoint.url)}`;
  }

  /**
   * Generate TypeScript declaration file for window variables
   */
  async #generateDeclarationFile(webpackOutputPath: string): Promise<void> {
    if (this.#state.dataStore.size === 0) {
      console.log('ApiInlinerPlugin: No data to generate TypeScript declarations for');
      return;
    }

    // Get declaration file path
    const declarationFilePathBase = this.#state.options.declarationFilePath ?? '';
    const declarationFilePath = path.resolve(
      webpackOutputPath,
      declarationFilePathBase
    );

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(declarationFilePath), { recursive: true });

    // Build declaration content immutably
    const declarationContent = this.#buildDeclarationContent();

    // Write to file
    await fs.writeFile(declarationFilePath, declarationContent);
    console.log(`ApiInlinerPlugin: TypeScript declarations generated at ${declarationFilePath}`);
  }

  /**
   * Build TypeScript declaration content
   */
  #buildDeclarationContent(): string {
    const header = `/**
 * Auto-generated TypeScript declarations for API Inliner Plugin
 * Generated on: ${new Date().toISOString()}
 * DO NOT EDIT DIRECTLY
 */

declare global {
  interface Window {`;

    const footer = `  }
}

export {}; // This file is a module
`;

    // Build window variable declarations
    const declarations = Array.from(this.#state.dataStore.values())
      .filter(entry => this.#shouldInlineEndpoint(entry.endpoint))
      .map(entry => {
        const variableName = this.#getVariableName(entry.endpoint);
        const typeRef = entry.endpoint.typeReference ??
                       this.#state.options.defaultType ??
                       'any';

        return `    ${variableName}: ${typeRef};`;
      })
      .join('\n');

    return `${header}\n${declarations}\n${footer}`;
  }

  /**
   * Fetch data from an API endpoint with retry mechanism using native fetch API
   * Optimized with exponential backoff for retries
   */
  async #fetchFromApi(
    apiUrl: string,
    requestOptions: RequestInit = {},
    timeout: number | undefined = DEFAULT_CONFIG.requestTimeout,
    retries: number | undefined = DEFAULT_CONFIG.retryCount
  ): Promise<unknown> {
    // Convert legacy http request options to fetch options immutably
    const fetchOptions: RequestInit = Object.freeze({
      method: 'GET',
      ...requestOptions,
      headers: Object.freeze({
        'Accept': 'application/json',
        ...((requestOptions as any).headers ?? {})
      }),
      ...(typeof timeout === 'number' ? { signal: AbortSignal.timeout(timeout) } : {})
    });

    // Function to attempt the fetch with retries and exponential backoff
    const fetchWithRetry = async (retriesLeft: number, attempt: number = 0): Promise<unknown> => {
      try {
        const response = await fetch(apiUrl, fetchOptions);

        // Handle HTTP error responses
        if (!response.ok) {
          const error = new Error(`HTTP request failed with status code ${response.status}`);

          // Retry on 5xx errors if we have retries left
          if (response.status >= 500 && retriesLeft > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
            console.log(`ApiInlinerPlugin: Retrying ${apiUrl} due to ${response.status} error in ${delay}ms (${retriesLeft} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(retriesLeft - 1, attempt + 1);
          }

          throw error;
        }

        // Parse JSON response
        return await response.json();

      } catch (error) {
        // Handle network errors and retries
        if (retriesLeft > 0 && !(error instanceof SyntaxError)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          console.log(`ApiInlinerPlugin: Retrying ${apiUrl} due to error: ${(error as Error).message} in ${delay}ms (${retriesLeft} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(retriesLeft - 1, attempt + 1);
        }
        throw error;
      }
    };

    // Start with full retry count
    return fetchWithRetry(typeof retries === 'number' ? retries : DEFAULT_CONFIG.retryCount);
  }

  /**
   * Generate a safe variable name from a URL
   */
  #getVariableNameFromUrl(apiUrl: string): string {
    try {
      const url = new URL(apiUrl);
      const pathSegments = url.pathname.split('/').filter(Boolean);

      // Use the last segment of the path, or hostname if path is empty
      const baseSegment = pathSegments.length > 0
        ? pathSegments.at(-1)!
        : url.hostname;

      // Replace non-alphanumeric characters with underscores and convert to uppercase
      return baseSegment
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/^[0-9]/, '_$&')
        .toUpperCase();
    } catch {
      // Fallback if URL is invalid
      return apiUrl.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    }
  }
}

export default ApiInlinerPlugin;

// Also re-export interfaces for consumers
export type * from './interfaces';

// Export hooks
export * from './hooks';