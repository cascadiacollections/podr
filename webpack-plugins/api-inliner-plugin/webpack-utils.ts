/**
 * Webpack Version Detection Utilities
 * 
 * Provides utilities for detecting webpack and HtmlWebpackPlugin versions
 * to ensure compatibility across webpack 4 and 5.
 */

import { Compiler } from 'webpack';
import * as semver from 'semver';

/**
 * Detection result for webpack and HtmlWebpackPlugin versions
 */
export interface IVersionInfo {
  /**
   * Major webpack version (4 or 5)
   */
  webpackMajorVersion: number;
  
  /**
   * Whether HtmlWebpackPlugin v4 hooks are available
   */
  hasHtmlWebpackPluginV4Hooks: boolean;
  
  /**
   * Whether HtmlWebpackPlugin v5 hooks are available
   */
  hasHtmlWebpackPluginV5Hooks: boolean;
}

/**
 * Determines the webpack and HtmlWebpackPlugin versions being used
 * @param compiler - Webpack compiler instance
 * @param HtmlWebpackPlugin - HtmlWebpackPlugin instance (can be undefined)
 * @returns Version information for webpack and HtmlWebpackPlugin
 */
export function detectVersions(compiler: Compiler, HtmlWebpackPlugin: any): IVersionInfo {
  // Detect webpack version using semver for more robust detection
  let webpackMajorVersion = 4; // Default to webpack 4
  
  try {
    // In webpack 5, compiler.webpack is defined with a version property
    if (compiler.webpack?.version) {
      const version = compiler.webpack.version;
      const parsed = semver.parse(version);
      if (parsed) {
        webpackMajorVersion = parsed.major;
      }
    } else {
      // For webpack 4, check if we can load webpack and get its version
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const webpack = require('webpack');
        if (webpack.version) {
          const parsed = semver.parse(webpack.version);
          if (parsed) {
            webpackMajorVersion = parsed.major;
          }
        }
      } catch (e) {
        // If we can't load webpack directly, default to detected version
        console.warn('ApiInlinerPlugin: Could not determine webpack version precisely, defaulting to webpack 4');
      }
    }
  } catch (e) {
    console.warn('ApiInlinerPlugin: Error during webpack version detection:', e);
  }
  
  // Initialize result with detected webpack version
  const result: IVersionInfo = {
    webpackMajorVersion,
    hasHtmlWebpackPluginV4Hooks: false,
    hasHtmlWebpackPluginV5Hooks: false
  };

  // If HtmlWebpackPlugin is not available, return early
  if (!HtmlWebpackPlugin) {
    return result;
  }
  
  // Check for HtmlWebpackPlugin v4/v5 hooks availability by feature detection
  if (HtmlWebpackPlugin.getHooks && typeof HtmlWebpackPlugin.getHooks === 'function') {
    // We have HtmlWebpackPlugin v4 or v5 with getHooks API
    try {
      // Try to access a compilation to test for hooks
      // This is just a feature detection, no actual hook registration
      
      // For webpack 4, mark v4 hooks as available
      if (webpackMajorVersion === 4 && compiler.hooks && compiler.hooks.compilation) {
        // Feature detection for HtmlWebpackPlugin v4
        result.hasHtmlWebpackPluginV4Hooks = true;
      }
      
      // For webpack 5, mark v5 hooks as available
      if (webpackMajorVersion === 5) {
        result.hasHtmlWebpackPluginV5Hooks = true;
      }
    } catch (e) {
      // If any error occurs during detection, assume the worst case
      console.warn('ApiInlinerPlugin: Error during HtmlWebpackPlugin hook detection:', e);
    }
  } else if (HtmlWebpackPlugin.prototype && HtmlWebpackPlugin.prototype.apply) {
    // Very old HtmlWebpackPlugin without getHooks API
    console.warn('ApiInlinerPlugin: Detected legacy HtmlWebpackPlugin without getHooks API');
  }
  
  return result;
}