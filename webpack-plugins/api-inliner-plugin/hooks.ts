/**
 * API Inliner Hooks
 * 
 * Provides Preact/React hooks for accessing data inlined by the API Inliner Plugin.
 */

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
export function useApiInliner<T>(variableName: string, jsonPath: string, options?: RequestInit) {
  // These types allow for compatibility with both Preact and React
  type SetState<S> = (value: S | ((prevState: S) => S)) => void;
  type StateHook<S> = [S, SetState<S>];
  type EffectHook = (effect: () => void | (() => void), deps?: ReadonlyArray<any>) => void;
  
  // Get the hooks from whatever library is available
  // This approach works with both Preact and React
  const useState: <S>(initialState: S | (() => S)) => StateHook<S> = 
    (window as any).preactHooks?.useState || 
    (window as any).React?.useState || 
    require('preact/hooks').useState;

  const useEffect: EffectHook = 
    (window as any).preactHooks?.useEffect || 
    (window as any).React?.useEffect || 
    require('preact/hooks').useEffect;

  // Initialize state - check for window variable first to avoid unnecessary re-renders
  const initialData = typeof window !== 'undefined' && window[variableName as keyof Window] 
    ? window[variableName as keyof Window] as T 
    : null;
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(initialData === null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip effect if data was already set from window variable during initialization
    if (data !== null) {
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

    // Fall back to static JSON file
    fetch(`/${jsonPath}`, options)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(result => {
        setData(result as T);
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