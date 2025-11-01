"use strict";
/**
 * API Inliner Hooks
 *
 * Provides Preact/React hooks for accessing data inlined by the API Inliner Plugin.
 * Optimized for performance with proper dependency tracking and cleanup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useApiInliner = void 0;
// Cache for hook resolution to avoid repeated lookups
let cachedHooks = null;
/**
 * Get hooks from the available library (Preact or React)
 * Cached for performance to avoid repeated lookups
 */
function getHooks() {
    var _a, _b, _c, _d, _e, _f;
    if (cachedHooks) {
        return cachedHooks;
    }
    // Check window availability once
    const isWindowAvailable = typeof window !== 'undefined';
    // Try to get hooks from global scope or require
    const useState = (isWindowAvailable && ((_a = window.preactHooks) === null || _a === void 0 ? void 0 : _a.useState)) ||
        (isWindowAvailable && ((_b = window.React) === null || _b === void 0 ? void 0 : _b.useState)) ||
        require('preact/hooks').useState;
    const useEffect = (isWindowAvailable && ((_c = window.preactHooks) === null || _c === void 0 ? void 0 : _c.useEffect)) ||
        (isWindowAvailable && ((_d = window.React) === null || _d === void 0 ? void 0 : _d.useEffect)) ||
        require('preact/hooks').useEffect;
    const useMemo = (isWindowAvailable && ((_e = window.preactHooks) === null || _e === void 0 ? void 0 : _e.useMemo)) ||
        (isWindowAvailable && ((_f = window.React) === null || _f === void 0 ? void 0 : _f.useMemo)) ||
        require('preact/hooks').useMemo;
    cachedHooks = { useState, useEffect, useMemo };
    return cachedHooks;
}
/**
 * Custom hook for accessing data inlined by the API Inliner Plugin.
 * Compatible with Preact hooks and React hooks.
 *
 * Optimized for performance:
 * - Proper dependency tracking to avoid unnecessary re-renders
 * - Cleanup with AbortController to prevent memory leaks
 * - Memoized options to avoid creating new references
 * - Cached hook resolution for better performance
 *
 * @template T - Type of the data (for type safety)
 * @param variableName - The name of the window variable to check
 * @param jsonPath - The path to the fallback JSON file if the window variable isn't available
 * @param options - Optional fetch options for the JSON request
 * @returns Object containing data, loading state, and error (if any)
 *
 * @example
 * ```tsx
 * // In your Preact component
 * const { data, isLoading, error } = useApiInliner<ProductsData>('EXAMPLE_PRODUCTS', 'products.json');
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * return <div>{data.products.length} products found</div>;
 * ```
 */
function useApiInliner(variableName, jsonPath, options) {
    const { useState, useEffect, useMemo } = getHooks();
    // Initialize state - check for window variable first to avoid unnecessary re-renders
    const initialData = useMemo(() => {
        if (typeof window !== 'undefined' && window[variableName]) {
            return window[variableName];
        }
        return null;
    }, [variableName]); // Include variableName to handle dynamic variable names
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(initialData === null);
    const [error, setError] = useState(null);
    // Memoize options stringification to avoid recomputation on every render
    // This is more efficient than stringifying in the dependency array
    const optionsKey = useMemo(() => options ? JSON.stringify(options) : undefined, [options]);
    // Memoize the stable options object
    const stableOptions = useMemo(() => options, [optionsKey]);
    useEffect(() => {
        // Skip effect if data was already set from window variable during initialization
        if (initialData !== null) {
            return;
        }
        // Check again for window variable (in case it was set after initialization)
        if (typeof window !== 'undefined' && window[variableName]) {
            try {
                const windowData = window[variableName];
                setData(windowData);
                setIsLoading(false);
                return; // Early exit if window variable is available
            }
            catch (err) {
                console.error(`Error accessing window.${variableName}:`, err);
                // Continue to fallback method
            }
        }
        // Create abort controller for cleanup
        const abortController = new AbortController();
        // Fall back to static JSON file
        fetch(`/${jsonPath}`, {
            ...stableOptions,
            signal: abortController.signal
        })
            .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
            .then(result => {
            if (!abortController.signal.aborted) {
                setData(result);
            }
        })
            .catch(err => {
            if (!abortController.signal.aborted) {
                // Only set error if it's not an abort error
                if (err.name !== 'AbortError') {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    console.error(`Failed to load data from ${jsonPath}:`, err);
                }
            }
        })
            .finally(() => {
            if (!abortController.signal.aborted) {
                setIsLoading(false);
            }
        });
        // Cleanup function to abort fetch on unmount
        return () => {
            abortController.abort();
        };
    }, [variableName, jsonPath, stableOptions]); // Removed initialData from dependencies
    return { data, isLoading, error };
}
exports.useApiInliner = useApiInliner;
//# sourceMappingURL=hooks.js.map