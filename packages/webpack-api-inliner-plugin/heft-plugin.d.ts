/**
 * Heft Plugin Integration for API Inliner
 *
 * This file demonstrates how to integrate ApiInlinerPlugin with Heft's plugin system.
 */
import { HeftConfiguration, HeftSession } from '@rushstack/heft';
/**
 * A Heft plugin that adds the API Inliner functionality to Webpack builds
 */
export declare class ApiInlinerHeftPlugin {
    /**
     * Applies this plugin to the Heft session
     */
    static apply(heftSession: HeftSession, heftConfiguration: HeftConfiguration): void;
}
export declare function setupApiInlinerPlugin(heftSession: HeftSession, heftConfiguration: HeftConfiguration): void;
//# sourceMappingURL=heft-plugin.d.ts.map