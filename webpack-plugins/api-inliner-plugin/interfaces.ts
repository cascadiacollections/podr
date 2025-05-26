/**
 * API Inliner Plugin
 * 
 * Type definitions for the API Inliner Plugin configuration
 */

import { Compiler } from 'webpack';

/**
 * Configuration for an individual API endpoint
 */
export interface IEndpointConfig {
  /**
   * The API endpoint URL to fetch data from
   */
  url: string;
  
  /**
   * The filename to save the fetched data to (if saveAsFile is true)
   */
  outputFile?: string;
  
  /**
   * The fallback data to use if the API request fails or in development mode
   */
  fallbackData?: any;
  
  /**
   * Whether to inline data as window variable
   * @default undefined - Inherits from global configuration
   */
  inlineAsVariable?: boolean;
  
  /**
   * Name of the window variable to use when inlining.
   * If not provided, it will be auto-generated based on the URL.
   */
  variableName?: string;
  
  /**
   * Options to pass to the fetch request (headers, method, etc)
   */
  requestOptions?: RequestInit;
  
  /**
   * Whether to save data as static JSON file
   * @default undefined - Inherits from global configuration
   */
  saveAsFile?: boolean;
  
  /**
   * TypeScript type reference for this endpoint's data
   * Example: "import('../../src/types').ITopPodcasts"
   */
  typeReference?: string;
  
  /**
   * Whether to always fetch from API regardless of production status
   * @default undefined - Inherits from global configuration
   */
  alwaysFetchFromApi?: boolean;
  
  /**
   * Override the production setting for this specific endpoint
   * @default undefined - Inherits from global configuration
   */
  production?: boolean;
}

/**
 * Configuration for the API Inliner Plugin
 * 
 * This interface matches the schema defined in ./schema.json
 */
export interface IApiInlinerConfiguration {
  /**
   * API endpoints to fetch data from during build
   */
  endpoints: IEndpointConfig[];
  
  /**
   * Whether to fetch data from API (production) or just use fallback (development)
   * @default process.env.NODE_ENV === 'production'
   */
  production?: boolean;
  
  /**
   * Whether to always fetch from API regardless of production/development mode
   * This overrides production flag if true, and will try to fetch real data
   * even in development mode.
   * @default true
   */
  alwaysFetchFromApi?: boolean;
  
  /**
   * Global setting for whether to inline data as window variables
   * @default true
   */
  inlineAsVariable?: boolean;
  
  /**
   * Prefix for all window variables when auto-generating names
   * @default "API_DATA"
   */
  variablePrefix?: string;
  
  /**
   * Whether to save data as static JSON files
   * @default true
   */
  saveAsFile?: boolean;
  
  /**
   * Timeout in milliseconds for API requests
   * @default 10000
   */
  requestTimeout?: number;
  
  /**
   * Number of times to retry a failed request
   * @default 2
   */
  retryCount?: number;
  
  /**
   * Custom path to save JSON files to (relative to webpack output path)
   * @default ""
   */
  outputPath?: string;
  
  /**
   * Whether to emit TypeScript declaration (.d.ts) files for inlined variables
   * @default false
   */
  emitDeclarationFile?: boolean;
  
  /**
   * Output path for TypeScript declaration file (relative to webpack output path)
   * @default "api-inliner.d.ts"
   */
  declarationFilePath?: string;
  
  /**
   * Default type to use for window variables when no specific type is provided
   * @default "any"
   */
  defaultType?: string;
  
  /**
   * Callback function to run after successful data fetch
   * @param data - The fetched data
   * @param endpoint - The endpoint configuration
   */
  onSuccess?: (data: any, endpoint: IEndpointConfig) => void;
  
  /**
   * Callback function to run after failed data fetch
   * @param error - The error
   * @param endpoint - The endpoint configuration
   */
  onError?: (error: Error, endpoint: IEndpointConfig) => void;
}

/**
 * API Inliner Plugin interface
 */
export interface IApiInlinerPlugin {
  /**
   * Apply the plugin to the webpack compiler
   * @param compiler - The webpack compiler
   */
  apply(compiler: Compiler): void;
}

/**
 * Data store entry interface for the API Inliner Plugin
 */
export interface IApiDataStoreEntry {
  /**
   * The data fetched from the API
   */
  data: any;
  
  /**
   * The endpoint configuration
   */
  endpoint: IEndpointConfig;
}

/**
 * Type for the data store
 */
export type ApiDataStore = Map<string, IApiDataStoreEntry>;