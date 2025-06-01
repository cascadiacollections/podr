/**
 * Rush Stack API Inliner Plugin
 *
 * A webpack plugin that fetches API data during build time and inlines it or saves it to static files.
 * Compatible with RushStack/Heft build system and follows Rush Stack design patterns.
 */
import { Compiler } from 'webpack';
import { IApiInlinerConfiguration, IApiInlinerPlugin } from './interfaces';
/**
 * ApiInlinerPlugin for RushStack/Heft
 *
 * This plugin fetches API data during build time and makes it available to your app
 * either as static JSON files or as inline window variables.
 */
export declare class ApiInlinerPlugin implements IApiInlinerPlugin {
    private readonly options;
    private readonly dataStore;
    /**
     * Create a new ApiInlinerPlugin instance
     * @param options - Plugin configuration
     */
    constructor(options: IApiInlinerConfiguration);
    /**
     * Apply the plugin to the webpack compiler
     * @param compiler - The webpack compiler
     */
    apply(compiler: Compiler): void;
    /**
     * Process a single endpoint configuration
     * @param endpoint - Endpoint configuration
     * @param webpackOutputPath - Webpack output path
     * @returns Promise that resolves when the endpoint is processed
     */
    private processEndpoint;
    /**
     * Generate TypeScript declaration file for window variables
     * @param webpackOutputPath - Webpack output directory path
     */
    private generateDeclarationFile;
    /**
     * Fetch data from an API endpoint with retry mechanism using native fetch API
     * @param apiUrl - The URL to fetch data from
     * @param requestOptions - Options to pass to the fetch API
     * @param timeout - Request timeout in milliseconds
     * @param retries - Number of retries on failure
     * @returns Promise that resolves with the parsed JSON data
     */
    private fetchFromApi;
    /**
     * Generate a safe variable name from a URL
     * @param apiUrl - The API URL
     * @returns A safe variable name
     */
    private getVariableNameFromUrl;
}
export default ApiInlinerPlugin;
export * from './interfaces';
export * from './hooks';
//# sourceMappingURL=index.d.ts.map