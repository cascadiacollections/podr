/**
 * API Inliner Hooks
 *
 * Provides Preact/React hooks for accessing data inlined by the API Inliner Plugin.
 * Optimized for performance with proper dependency tracking and cleanup.
 */
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
export declare function useApiInliner<T>(variableName: string, jsonPath: string, options?: RequestInit): {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
};
//# sourceMappingURL=hooks.d.ts.map