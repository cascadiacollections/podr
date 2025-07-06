import { computed, ReadonlySignal, signal } from '@preact/signals';
import { useCallback, useMemo, useRef } from 'preact/hooks';

// Shared empty singletons for stable references
const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_SET = Object.freeze(new Set());
const EMPTY_MAP = Object.freeze(new Map());

// Options for collection stabilization
interface StableOptions {
  /** Custom equality function for comparison */
  isEqual?: (a: unknown, b: unknown) => boolean;
  /** Enable debug warnings in development */
  debug?: boolean;
}

// Development warning helper
const warn = (message: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[use-stable-collections] ${message}`);
  }
};

// Default shallow equality for collections
export const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => item === b[i]);
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (b.get(key) !== value) return false;
    }
    return true;
  }

  return false;
};

/**
 * Ensures a collection has a stable reference when empty or unchanged.
 * This prevents unnecessary re-renders when collections remain empty or equivalent.
 *
 * @param collection - The collection to stabilize
 * @param options - Configuration options
 * @returns A stable reference to the collection
 *
 * @example
 * ```tsx
 * // Arrays get stable empty reference
 * const items = useStable(searchResults); // [] -> same reference always
 *
 * // Sets get stable empty reference
 * const selectedIds = useStable(new Set(selected));
 *
 * // Maps get stable empty reference
 * const itemMap = useStable(new Map(pairs));
 * ```
 */
export function useStable<T>(array: readonly T[], options?: StableOptions): readonly T[];
export function useStable<T>(set: ReadonlySet<T>, options?: StableOptions): ReadonlySet<T>;
export function useStable<K, V>(map: ReadonlyMap<K, V>, options?: StableOptions): ReadonlyMap<K, V>;
export function useStable(collection: unknown, options: StableOptions = {}) {
  const { isEqual = shallowEqual, debug = false } = options;
  const previousRef = useRef(collection);

  return useMemo(() => {
    // Handle arrays
    if (Array.isArray(collection)) {
      if (collection.length === 0) {
        if (debug) {
          warn('Stabilizing empty array');
        }
        return EMPTY_ARRAY;
      }

      if (isEqual(collection, previousRef.current)) {
        return previousRef.current;
      }

      previousRef.current = collection;
      return collection;
    }

    // Handle Sets
    if (collection instanceof Set) {
      if (collection.size === 0) {
        if (debug) {
          warn('Stabilizing empty Set');
        }
        return EMPTY_SET;
      }

      if (isEqual(collection, previousRef.current)) {
        return previousRef.current;
      }

      previousRef.current = collection;
      return collection;
    }

    // Handle Maps
    if (collection instanceof Map) {
      if (collection.size === 0) {
        if (debug) {
          warn('Stabilizing empty Map');
        }
        return EMPTY_MAP;
      }

      if (isEqual(collection, previousRef.current)) {
        return previousRef.current;
      }

      previousRef.current = collection;
      return collection;
    }

    // Fallback for other types
    return collection;
  }, [collection, isEqual, debug]);
}

/**
 * Creates a reactive signal containing a stable collection reference.
 * Combines the benefits of useStable with Preact Signals for reactive updates.
 *
 * @param collection - The collection to make reactive
 * @param options - Configuration options
 * @returns A reactive signal containing the stable collection
 *
 * @example
 * ```tsx
 * const itemsSignal = useStableSignal(searchResults);
 *
 * // Use in computed values
 * const itemCount = computed(() => itemsSignal.value.length);
 * ```
 */
export function useStableSignal(collection: any, options: StableOptions = {}): ReadonlySignal<any> {
  const stableCollection = useStable(collection as any, options);
  const collectionSignal = useMemo(() => signal(stableCollection), []);

  // Update signal when stable collection changes
  useEffect(() => {
    if (collectionSignal.value !== stableCollection) {
      collectionSignal.value = stableCollection;
    }
  }, [stableCollection, collectionSignal]);

  return collectionSignal;
}

/**
 * Creates computed signals that derive from stable collections.
 * Useful for creating reactive transformations of collections.
 *
 * @example
 * ```tsx
 * const items = useStableSignal([1, 2, 3]);
 *
 * const doubled = useComputedCollection(items, (arr) =>
 *   arr.map(x => x * 2)
 * );
 * ```
 */
export function useComputedCollection<T, U>(
  source: ReadonlySignal<T>,
  transform: (value: T) => U,
  options?: StableOptions
): ReadonlySignal<U> {
  return useMemo(() => computed(() => {
    const transformed = transform(source.value);
    // Apply stability to the transformed result if it's a collection
    if (Array.isArray(transformed) || transformed instanceof Set || transformed instanceof Map) {
      return useStable(transformed as any, options) as U;
    }
    return transformed;
  }), [source, transform, options]);
}

/**
 * Combines multiple stable collection signals into a single reactive signal.
 *
 * @example
 * ```tsx
 * const items1 = useStableSignal([1, 2]);
 * const items2 = useStableSignal([3, 4]);
 *
 * const combined = useCombinedCollections(
 *   [items1, items2],
 *   ([arr1, arr2]) => [...arr1, ...arr2]
 * );
 * ```
 */
export function useCombinedCollections<T extends ReadonlySignal<unknown>[], U>(
  sources: T,
  combiner: (values: { [K in keyof T]: T[K] extends ReadonlySignal<infer V> ? V : never }) => U,
  options?: StableOptions
): ReadonlySignal<U> {
  return useMemo(() => computed(() => {
    const values = sources.map(signal => signal.value) as any;
    const combined = combiner(values);

    // Apply stability if result is a collection
    if (Array.isArray(combined) || combined instanceof Set || combined instanceof Map) {
      return useStable(combined as any, options) as U;
    }
    return combined;
  }), [sources, combiner, options]);
}

/**
 * Hook for managing collection state with signals and stability.
 * Provides both imperative updates and reactive access.
 *
 * @example
 * ```tsx
 * const [items, setItems] = useStableCollectionState([]);
 *
 * // Reactive access
 * const itemCount = computed(() => items.value.length);
 *
 * // Imperative updates
 * const addItem = useCallback((item) => {
 *   setItems(prev => [...prev, item]);
 * }, [setItems]);
 * ```
 */
export function useStableCollectionState(initialValue: any, options: StableOptions = {}): [ReadonlySignal<any>, (updater: any) => void] {
  const stableInitial = useStable(initialValue, options);
  const collectionSignal = useMemo(() => signal(stableInitial), [stableInitial]);

  const setCollection = useCallback((updater: any) => {
    const newValue = typeof updater === 'function'
      ? updater(collectionSignal.value)
      : updater;

    const stableNewValue = useStable(newValue, options);
    collectionSignal.value = stableNewValue;
  }, [collectionSignal, options]);

  return [collectionSignal, setCollection];
}

/**
 * Transform arrays with built-in stable empty reference handling.
 * Provides a fluent API for common array operations.
 *
 * @example
 * ```tsx
 * const processedItems = useTransform(items)
 *   .filter(item => item.active)
 *   .map(item => ({ ...item, timestamp: Date.now() }))
 *   .take(10);
 * ```
 */
export function useTransform<T>(
  source: readonly T[],
  options?: StableOptions
) {
  const stableSource = useStable(source, options);

  return useMemo(() => ({
    /**
     * Filter array elements based on predicate
     */
    filter(predicate: (item: T, index: number, array: readonly T[]) => boolean): readonly T[] {
      const result = stableSource.filter(predicate);
      return useStable(result, options);
    },

    /**
     * Map array elements to new values
     */
    map<U>(mapper: (item: T, index: number, array: readonly T[]) => U): readonly U[] {
      const result = stableSource.map(mapper);
      return useStable(result, options);
    },

    /**
     * Get a slice of the array
     */
    slice(start?: number, end?: number): readonly T[] {
      const result = stableSource.slice(start, end);
      return useStable(result, options);
    },

    /**
     * Take first n elements
     */
    take(n: number): readonly T[] {
      const result = stableSource.slice(0, n);
      return useStable(result, options);
    },

    /**
     * Get unique elements
     */
    unique(): readonly T[] {
      const result = [...new Set(stableSource)];
      return useStable(result, options);
    },

    /**
     * Sort elements
     */
    sort(compareFn?: (a: T, b: T) => number): readonly T[] {
      const result = [...stableSource].sort(compareFn);
      return useStable(result, options);
    }
  }), [stableSource, options]);
}

// Convenience re-exports
export { computed, signal } from '@preact/signals';
export type { ReadonlySignal, Signal } from '@preact/signals';
