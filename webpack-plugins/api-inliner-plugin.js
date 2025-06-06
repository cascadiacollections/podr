'use strict';

/**
 * ApiInlinerPlugin - A webpack plugin for RushStack/Heft
 * 
 * This file serves as a bridge to the new TypeScript-based implementation.
 * It maintains backward compatibility while providing a path to move to the
 * more configurable and RushStack compatible implementation.
 * 
 * The plugin has been restructured to be more compatible with RushStack/Heft
 * architecture and design principles, making it suitable for publishing
 * as a standalone NPM package.
 */

const fs = require('fs');
const path = require('path');

let apiInlinerModule;

// Check if the new directory structure exists
// This is expected to be compiled to JS before being published
if (fs.existsSync(path.join(__dirname, 'api-inliner-plugin/index.ts'))) {
  try {
    // For development, directly use the TypeScript implementation if ts-node is available
    // eslint-disable-next-line
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2019'
      }
    });
    
    apiInlinerModule = require('./api-inliner-plugin/index');
    console.log('ApiInlinerPlugin: Using TypeScript implementation');
  } catch (e) {
    // Fallback to the old implementation
    console.warn('ApiInlinerPlugin: Could not load TypeScript implementation, using backup');
    apiInlinerModule = require('./api-inliner-plugin.old');
  }
} else if (fs.existsSync(path.join(__dirname, 'api-inliner-plugin/lib/index.js'))) {
  // For production, use the compiled JS
  apiInlinerModule = require('./api-inliner-plugin/lib/index');
} else {
  // Fallback to the old implementation for backward compatibility
  apiInlinerModule = require('./api-inliner-plugin.old');
}

// Export the plugin class as both a named export and a default export for backward compatibility
const ApiInlinerPlugin = apiInlinerModule.ApiInlinerPlugin || apiInlinerModule;

module.exports = ApiInlinerPlugin;
module.exports.ApiInlinerPlugin = ApiInlinerPlugin;

// Re-export any other exports from the module
Object.keys(apiInlinerModule).forEach(key => {
  if (key !== 'default' && key !== 'ApiInlinerPlugin') {
    module.exports[key] = apiInlinerModule[key];
  }
});