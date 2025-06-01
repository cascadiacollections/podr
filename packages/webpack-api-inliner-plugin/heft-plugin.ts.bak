/**
 * Heft Plugin Integration for API Inliner
 * 
 * This file demonstrates how to integrate ApiInlinerPlugin with Heft's plugin system.
 */

import * as path from 'path';
import * as fs from 'fs';
import { HeftConfiguration, HeftSession, ScopedLogger } from '@rushstack/heft';
import { IWebpackConfigurationUpdaterHookOptions } from '@rushstack/heft-webpack5-plugin';
import type { Configuration as WebpackConfiguration } from 'webpack';
import * as Ajv from 'ajv';

import { ApiInlinerPlugin, IApiInlinerConfiguration } from './index';

const PLUGIN_NAME = 'api-inliner-plugin';

/**
 * A Heft plugin that adds the API Inliner functionality to Webpack builds
 */
export class ApiInlinerHeftPlugin {
  /**
   * Applies this plugin to the Heft session
   */
  public static apply(
    heftSession: HeftSession,
    heftConfiguration: HeftConfiguration
  ): void {
    // Get a logger for this plugin
    const logger: ScopedLogger = heftSession.requestScopedLogger(PLUGIN_NAME);

    // Register a hook to modify the webpack configuration
    heftSession.hooks.webpackConfiguration.tap(PLUGIN_NAME, (options: IWebpackConfigurationUpdaterHookOptions) => {
      // Find the configuration file
      const configPath: string = path.resolve(heftConfiguration.buildFolder, 'api-inliner.json');
      
      // Skip if no configuration file exists
      if (!fs.existsSync(configPath)) {
        logger.terminal.writeLine(`No api-inliner.json configuration found at ${configPath}, skipping plugin activation`);
        return;
      }
      
      try {
        // Load and validate the configuration
        const configJson: string = fs.readFileSync(configPath, 'utf8');
        const config: IApiInlinerConfiguration = JSON.parse(configJson);
        
        // Validate the configuration against the schema
        const schemaPath: string = path.resolve(__dirname, 'schema.json');
        if (fs.existsSync(schemaPath)) {
          const schemaJson: string = fs.readFileSync(schemaPath, 'utf8');
          const schema: object = JSON.parse(schemaJson);
          
          const ajv: Ajv.default = new Ajv.default({ allErrors: true });
          const validate = ajv.compile(schema);
          
          if (!validate(config)) {
            logger.terminal.writeErrorLine(`Invalid API Inliner configuration:`);
            
            if (validate.errors) {
              for (const error of validate.errors) {
                logger.terminal.writeErrorLine(`  - ${error.instancePath}: ${error.message}`);
              }
            }
            
            return;
          }
        }
        
        // Add production flag from Heft
        config.production = options.webpack.mode === 'production';
        
        logger.terminal.writeLine(`API Inliner Plugin activated with ${config.endpoints.length} endpoints`);
        
        // Add the ApiInlinerPlugin to webpack config
        const webpackConfig: WebpackConfiguration = options.webpackConfig;
        
        if (!webpackConfig.plugins) {
          webpackConfig.plugins = [];
        }
        
        webpackConfig.plugins.push(new ApiInlinerPlugin(config));
        
      } catch (error) {
        logger.terminal.writeErrorLine(`Error loading API Inliner configuration: ${(error as Error).message}`);
      }
    });
  }
}

// Export a function to setup the Heft plugin
export function setupApiInlinerPlugin(heftSession: HeftSession, heftConfiguration: HeftConfiguration): void {
  ApiInlinerHeftPlugin.apply(heftSession, heftConfiguration);
}