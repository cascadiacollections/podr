/**
 * Heft Plugin Integration for API Inliner
 *
 * This file demonstrates how to integrate ApiInlinerPlugin with Heft's plugin system.
 */

import type { IHeftTaskSession } from '@rushstack/heft';
import { HeftConfiguration } from '@rushstack/heft';
import type { IScopedLogger } from '@rushstack/heft/lib/pluginFramework/logging/ScopedLogger';
import * as Ajv from 'ajv';
import * as fs from 'fs';
import * as path from 'path';
import type { Configuration as WebpackConfiguration } from 'webpack';

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
    heftSession: IHeftTaskSession,
    heftConfiguration: HeftConfiguration
  ): void {
    // Get a logger for this plugin
    const logger: IScopedLogger = heftSession.logger;

    // Register a hook to modify the webpack configuration
    // Heft's bundle task exposes hooks for webpackConfiguration
    const bundleHooks = (heftSession as any).hooks?.bundle?.hooks;
    if (bundleHooks && bundleHooks.webpackConfiguration) {
      bundleHooks.webpackConfiguration.tap(PLUGIN_NAME, (options: any) => {
        // Find the configuration file
        const configPath: string = path.resolve(heftConfiguration.buildFolderPath, 'api-inliner.json');
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
    } else {
      // Fallback: log warning if hooks are not available
      logger.terminal.writeWarningLine('Heft bundle hooks for webpackConfiguration not found. API Inliner plugin not activated.');
    }
    };
  }

// Export a function to setup the Heft plugin
export function setupApiInlinerPlugin(heftSession: IHeftTaskSession, heftConfiguration: HeftConfiguration): void {
  ApiInlinerHeftPlugin.apply(heftSession, heftConfiguration);
}