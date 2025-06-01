"use strict";
/**
 * Heft Plugin Integration for API Inliner
 *
 * This file demonstrates how to integrate ApiInlinerPlugin with Heft's plugin system.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiInlinerHeftPlugin = void 0;
exports.setupApiInlinerPlugin = setupApiInlinerPlugin;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const Ajv = __importStar(require("ajv"));
const index_1 = require("./index");
const PLUGIN_NAME = 'api-inliner-plugin';
/**
 * A Heft plugin that adds the API Inliner functionality to Webpack builds
 */
class ApiInlinerHeftPlugin {
    /**
     * Applies this plugin to the Heft session
     */
    static apply(heftSession, heftConfiguration) {
        // Get a logger for this plugin
        const logger = heftSession.requestScopedLogger(PLUGIN_NAME);
        // Register a hook to modify the webpack configuration
        heftSession.hooks.webpackConfiguration.tap(PLUGIN_NAME, (options) => {
            // Find the configuration file
            const configPath = path.resolve(heftConfiguration.buildFolder, 'api-inliner.json');
            // Skip if no configuration file exists
            if (!fs.existsSync(configPath)) {
                logger.terminal.writeLine(`No api-inliner.json configuration found at ${configPath}, skipping plugin activation`);
                return;
            }
            try {
                // Load and validate the configuration
                const configJson = fs.readFileSync(configPath, 'utf8');
                const config = JSON.parse(configJson);
                // Validate the configuration against the schema
                const schemaPath = path.resolve(__dirname, 'schema.json');
                if (fs.existsSync(schemaPath)) {
                    const schemaJson = fs.readFileSync(schemaPath, 'utf8');
                    const schema = JSON.parse(schemaJson);
                    const ajv = new Ajv.default({ allErrors: true });
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
                const webpackConfig = options.webpackConfig;
                if (!webpackConfig.plugins) {
                    webpackConfig.plugins = [];
                }
                webpackConfig.plugins.push(new index_1.ApiInlinerPlugin(config));
            }
            catch (error) {
                logger.terminal.writeErrorLine(`Error loading API Inliner configuration: ${error.message}`);
            }
        });
    }
}
exports.ApiInlinerHeftPlugin = ApiInlinerHeftPlugin;
// Export a function to setup the Heft plugin
function setupApiInlinerPlugin(heftSession, heftConfiguration) {
    ApiInlinerHeftPlugin.apply(heftSession, heftConfiguration);
}
//# sourceMappingURL=heft-plugin.js.map