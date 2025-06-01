"use strict";
/**
 * API Inliner Hooks
 *
 * Provides Preact/React hooks for accessing data inlined by the API Inliner Plugin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useApiInliner = useApiInliner;
/**
 * Custom hook for accessing data inlined by the API Inliner Plugin.
 * Compatible with Preact hooks and React hooks.
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
    var _a, _b, _c, _d;
    // Get the hooks from whatever library is available
    // This approach works with both Preact and React
    const useState = ((_a = window.preactHooks) === null || _a === void 0 ? void 0 : _a.useState) ||
        ((_b = window.React) === null || _b === void 0 ? void 0 : _b.useState) ||
        require('preact/hooks').useState;
    const useEffect = ((_c = window.preactHooks) === null || _c === void 0 ? void 0 : _c.useEffect) ||
        ((_d = window.React) === null || _d === void 0 ? void 0 : _d.useEffect) ||
        require('preact/hooks').useEffect;
    // Initialize state - check for window variable first to avoid unnecessary re-renders
    const initialData = typeof window !== 'undefined' && window[variableName]
        ? window[variableName]
        : null;
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(initialData === null);
    const [error, setError] = useState(null);
    useEffect(() => {
        // Skip effect if data was already set from window variable during initialization
        if (data !== null) {
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
        // Fall back to static JSON file
        fetch(`/${jsonPath}`, options)
            .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
            .then(result => {
            setData(result);
        })
            .catch(err => {
            setError(err instanceof Error ? err : new Error(String(err)));
            console.error(`Failed to load data from ${jsonPath}:`, err);
        })
            .finally(() => {
            setIsLoading(false);
        });
    }, [variableName, jsonPath, JSON.stringify(options), data]);
    return { data, isLoading, error };
}
//# sourceMappingURL=hooks.js.map