/**
 * Webpack Version Detection Utilities
 * 
 * Provides utilities for detecting webpack and HtmlWebpackPlugin versions
 * to ensure compatibility across webpack 4 and 5.
 */

import { Compiler } from 'webpack';

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
  // Detect webpack version based on compiler features
  // In webpack 5, compiler.webpack is defined
  const webpackMajorVersion = compiler.webpack ? 5 : 4;
  
  // Initialize result with default values
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
      let hooksDetected = false;
      
      // For webpack 4, compilation is available in the constructor
      if (webpackMajorVersion === 4 && compiler.hooks && compiler.hooks.compilation) {
        // Feature detection for HtmlWebpackPlugin v4
        result.hasHtmlWebpackPluginV4Hooks = true;
      }
      
      // For webpack 5, we assume v5 hooks if getHooks exists
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