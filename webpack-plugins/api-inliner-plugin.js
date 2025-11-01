'use strict';

/**
 * ApiInlinerPlugin - A webpack plugin for RushStack/Heft
 * 
 * This file serves as a bridge to the compiled package implementation.
 * It maintains backward compatibility by re-exporting from the main package.
 * 
 * The plugin has been restructured to be more compatible with RushStack/Heft
 * architecture and design principles, making it suitable for publishing
 * as a standalone NPM package.
 */

// Use the pre-compiled package version for optimal performance
// No runtime TypeScript compilation needed
const apiInlinerModule = require('../packages/webpack-api-inliner-plugin');

// Export the plugin class as both a named export and a default export for backward compatibility
const ApiInlinerPlugin = apiInlinerModule.ApiInlinerPlugin || apiInlinerModule.default || apiInlinerModule;

module.exports = ApiInlinerPlugin;
module.exports.ApiInlinerPlugin = ApiInlinerPlugin;

// Re-export all other exports from the module
Object.keys(apiInlinerModule).forEach(key => {
  if (key !== 'default' && key !== 'ApiInlinerPlugin' && !module.exports.hasOwnProperty(key)) {
    module.exports[key] = apiInlinerModule[key];
  }
});