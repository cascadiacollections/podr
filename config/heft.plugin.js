'use strict';

// This is a sample plugin registration file showing how to use the API Inliner plugin with Heft
// It loads the plugin dynamically to avoid requiring installation in this example
// In a real project, the plugin would be installed as a dependency

/**
 * This function configures plugins for Heft.
 * 
 * @param {Object} heftSession - The Heft session
 * @param {Object} heftConfiguration - The Heft configuration
 */
function configureHeft(heftSession, heftConfiguration) {
  try {
    // Try to load the plugin if available
    const pluginPath = require.resolve('../webpack-plugins/api-inliner-plugin/heft-plugin');
    const { setupApiInlinerPlugin } = require(pluginPath);
    
    // Register the plugin
    setupApiInlinerPlugin(heftSession, heftConfiguration);
    
    console.log('API Inliner Heft plugin registered successfully');
  } catch (e) {
    console.warn('API Inliner Heft plugin not available, skipping registration:', e.message);
  }
}

module.exports = {
  pluginDefinitions: [
    {
      pluginName: 'api-inliner-plugin',
      entryPoint: configureHeft
    }
  ]
};