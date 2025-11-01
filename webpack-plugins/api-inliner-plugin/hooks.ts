/**
 * API Inliner Hooks
 * 
 * Provides Preact/React hooks for accessing data inlined by the API Inliner Plugin.
 * Optimized for performance with proper dependency tracking and cleanup.
 */

import type { FunctionComponent } from 'preact';

// Hook types for compatibility
type SetState<S> = (value: S | ((prevState: S) => S)) => void;
type StateHook<S> = [S, SetState<S>];
type EffectHook = (effect: () => void | (() => void), deps?: ReadonlyArray<any>) => void;
type UseMemoHook = <T>(factory: () => T, deps: ReadonlyArray<any> | undefined) => T;

// Cache for hook resolution to avoid repeated lookups
let cachedHooks: {
  useState: <S>(initialState: S | (() => S)) => StateHook<S>;
  useEffect: EffectHook;
  useMemo: UseMemoHook;
} | null = null;

/**
 * Get hooks from the available library (Preact or React)
 * Cached for performance to avoid repeated lookups
 */
function getHooks() {
  if (cachedHooks) {
    return cachedHooks;
  }

  // Try to get hooks from global scope or require
  const useState = 
    (typeof window !== 'undefined' && (window as any).preactHooks?.useState) || 
    (typeof window !== 'undefined' && (window as any).React?.useState) || 
    require('preact/hooks').useState;

  const useEffect = 
    (typeof window !== 'undefined' && (window as any).preactHooks?.useEffect) || 
    (typeof window !== 'undefined' && (window as any).React?.useEffect) || 
    require('preact/hooks').useEffect;

  const useMemo = 
    (typeof window !== 'undefined' && (window as any).preactHooks?.useMemo) || 
    (typeof window !== 'undefined' && (window as any).React?.useMemo) || 
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
export function useApiInliner<T>(
  variableName: string, 
  jsonPath: string, 
  options?: RequestInit
): { data: T | null; isLoading: boolean; error: Error | null } {
  const { useState, useEffect, useMemo } = getHooks();

  // Initialize state - check for window variable first to avoid unnecessary re-renders
  const initialData = useMemo(() => {
    if (typeof window !== 'undefined' && window[variableName as keyof Window]) {
      return window[variableName as keyof Window] as T;
    }
    return null;
  }, []); // Empty deps - only compute once on mount

  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(initialData === null);
  const [error, setError] = useState<Error | null>(null);

  // Memoize options to avoid creating new references that would trigger re-renders
  const stableOptions = useMemo(() => options, [
    options ? JSON.stringify(options) : undefined
  ]);

  useEffect(() => {
    // Skip effect if data was already set from window variable during initialization
    if (initialData !== null) {
      return;
    }
    
    // Check again for window variable (in case it was set after initialization)
    if (typeof window !== 'undefined' && window[variableName as keyof Window]) {
      try {
        const windowData = window[variableName as keyof Window] as T;
        setData(windowData);
        setIsLoading(false);
        return; // Early exit if window variable is available
      } catch (err) {
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
          setData(result as T);
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
  }, [variableName, jsonPath, stableOptions, initialData]);

  return { data, isLoading, error };
}