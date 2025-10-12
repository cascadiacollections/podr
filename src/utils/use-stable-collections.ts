/**
 * Signals-First Stable Collections Utility
 * 
 * A comprehensive TypeScript utility for stable collection references with full Preact Signals integration.
 * Designed with modern TypeScript patterns and performance optimizations.
 * 
 * @module use-stable-collections
 * @author Podr Contributors
 */

import { computed, ReadonlySignal, signal } from '@preact/signals';
import { useCallback, useMemo, useRef } from 'preact/hooks';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Collection type aliases using TypeScript readonly modifiers
 */
type ReadonlyArray<T> = readonly T[];
type ReadonlySetType<T> = ReadonlySet<T>;
type ReadonlyMapType<K, V> = ReadonlyMap<K, V>;

/**
 * Configuration options for collection utilities
 */
interface CollectionOptions {
  /** Enable debug logging in development */
  readonly debug?: boolean;
  /** Maximum cache size for memoized operations (default: 100) */
  readonly cacheSize?: number;
}

// ============================================================================
// Empty Singletons - Performance Optimization
// ============================================================================

/**
 * Global singleton empty collections for referential stability.
 * Using Object.freeze ensures immutability and enables V8 optimizations.
 */
const EMPTY = {
  array: Object.freeze([]) as ReadonlyArray<never>,
  set: Object.freeze(new Set()) as unknown as ReadonlySetType<never>,
  map: Object.freeze(new Map()) as unknown as ReadonlyMapType<never, never>
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to check if a collection is empty
 * Uses optional chaining for null safety
 */
const isEmpty = <T>(collection: T): boolean => {
  if (!collection) return true;
  const col = collection as any;
  if (typeof col === 'object' && col !== null) {
    if ('size' in col) return col.size === 0;
    if ('length' in col) return col.length === 0;
  }
  return false;
};

// ============================================================================
// LRU Cache Implementation
// ============================================================================

/**
 * Least Recently Used (LRU) Cache for expensive operations.
 * Uses Map for O(1) operations and maintains insertion order.
 */
class LRUCache<K, V> {
  private readonly cache = new Map<string, V>();
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = Math.max(1, maxSize);
  }

  get(key: K): V | undefined {
    const strKey = JSON.stringify(key);
    const value = this.cache.get(strKey);
    
    if (value !== undefined) {
      // Move to end (most recently used) - leverages Map insertion order
      this.cache.delete(strKey);
      this.cache.set(strKey, value);
    }
    
    return value;
  }

  set(key: K, value: V): void {
    const strKey = JSON.stringify(key);

    if (this.cache.has(strKey)) {
      // Update existing - remove and re-add to move to end
      this.cache.delete(strKey);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first item in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(strKey, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Core Collection Hook
// ============================================================================

/**
 * Create a reactive signal from any collection with automatic empty singleton optimization.
 * 
 * @template T - Collection element type
 * @param items - Collection to convert to signal (Array, Set, or Map)
 * @param options - Configuration options
 * @returns ReadonlySignal containing the stable collection reference
 * 
 * @example
 * ```tsx
 * const items = useCollection([1, 2, 3]);
 * const emptyItems = useCollection([]); // Returns singleton EMPTY.array
 * const itemSet = useCollection(new Set([1, 2]));
 * ```
 */
export function useCollection<T>(
  items: ReadonlyArray<T>, 
  options?: CollectionOptions
): ReadonlySignal<ReadonlyArray<T>>;

export function useCollection<T>(
  items: ReadonlySetType<T>, 
  options?: CollectionOptions
): ReadonlySignal<ReadonlySetType<T>>;

export function useCollection<K, V>(
  items: ReadonlyMapType<K, V>, 
  options?: CollectionOptions
): ReadonlySignal<ReadonlyMapType<K, V>>;

export function useCollection<T>(
  items: any, 
  options?: CollectionOptions
): ReadonlySignal<any> {
  const { debug } = options ?? {};

  return useMemo(() => {
    return computed(() => {
      if (debug && process.env.NODE_ENV !== 'production') {
        const size = items?.size ?? items?.length ?? 0;
        console.log(`[useCollection] Processing collection with ${size} items`);
      }

      // Return singleton for empty collections
      if (isEmpty(items)) {
        if (Array.isArray(items)) return EMPTY.array;
        if (items instanceof Set) return EMPTY.set;
        if (items instanceof Map) return EMPTY.map;
      }

      return items;
    });
  }, [items, debug]);
}

// ============================================================================
// Transform API
// ============================================================================

/**
 * Enhanced transform API with fluent method chaining and automatic caching.
 * Provides a rich set of array transformation operations with signals-first design.
 * 
 * @template T - Array element type
 * @param source - Source array or signal to transform
 * @param options - Configuration options
 * @returns Transform API object with chainable methods
 * 
 * @example
 * ```tsx
 * const processed = useTransform(items)
 *   .filter(x => x.active)
 *   .map(x => ({ ...x, timestamp: Date.now() }))
 *   .sort((a, b) => a.priority - b.priority)
 *   .take(10);
 * ```
 */
export function useTransform<T>(
  source: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>,
  options?: CollectionOptions
) {
  const { cacheSize = 100, debug } = options ?? {};

  // Convert input to signal for uniform handling
  const sourceSignal = useMemo<ReadonlySignal<ReadonlyArray<T>>>(() => {
    if (typeof source === 'object' && source !== null && 'value' in source) {
      return source as ReadonlySignal<ReadonlyArray<T>>;
    }
    return signal(source as ReadonlyArray<T>);
  }, [source]);

  // Persistent cache across re-renders
  const cache = useRef(new LRUCache<any, any>(cacheSize));

  const log = useCallback((operation: string, count: number) => {
    if (debug && process.env.NODE_ENV !== 'production') {
      console.log(`[useTransform.${operation}] Processing ${count} items`);
    }
  }, [debug]);

  return {
    /** Access the underlying source signal */
    source: sourceSignal,

    /**
     * Filter items based on predicate
     */
    filter(predicate: (item: T, index: number) => boolean): ReadonlySignal<ReadonlyArray<T>> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('filter', items.length);

        if (isEmpty(items)) return EMPTY.array as ReadonlyArray<T>;

        const cacheKey = { op: 'filter', items, fn: predicate.toString() };
        const cached = cache.current.get(cacheKey);
        if (cached !== undefined) return cached;

        const result = items.filter(predicate);
        const finalResult = isEmpty(result) ? EMPTY.array as ReadonlyArray<T> : result;
        cache.current.set(cacheKey, finalResult);
        return finalResult;
      }), [sourceSignal, predicate, log]);
    },

    /**
     * Map items to new values
     */
    map<U>(mapper: (item: T, index: number) => U): ReadonlySignal<ReadonlyArray<U>> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('map', items.length);

        if (isEmpty(items)) return EMPTY.array as ReadonlyArray<U>;

        const cacheKey = { op: 'map', items, fn: mapper.toString() };
        const cached = cache.current.get(cacheKey);
        if (cached !== undefined) return cached;

        const result = items.map(mapper);
        cache.current.set(cacheKey, result);
        return result;
      }), [sourceSignal, mapper, log]);
    },

    /**
     * Sort items using compare function
     */
    sort(compareFn?: (a: T, b: T) => number): ReadonlySignal<ReadonlyArray<T>> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('sort', items.length);

        if (isEmpty(items)) return EMPTY.array as ReadonlyArray<T>;

        const cacheKey = { op: 'sort', items, fn: compareFn?.toString() ?? 'default' };
        const cached = cache.current.get(cacheKey);
        if (cached !== undefined) return cached;

        // Create new array to avoid mutating source
        const result = [...items].sort(compareFn);
        cache.current.set(cacheKey, result);
        return result;
      }), [sourceSignal, compareFn, log]);
    },

    /**
     * Get unique items (removes duplicates)
     */
    unique(): ReadonlySignal<ReadonlyArray<T>> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('unique', items.length);

        if (isEmpty(items)) return EMPTY.array as ReadonlyArray<T>;

        const cacheKey = { op: 'unique', items };
        const cached = cache.current.get(cacheKey);
        if (cached !== undefined) return cached;

        // Use Set for O(n) uniqueness check
        const seen = new Set<T>();
        const result = items.filter(item => {
          if (seen.has(item)) return false;
          seen.add(item);
          return true;
        });

        const finalResult = isEmpty(result) ? EMPTY.array as ReadonlyArray<T> : result;
        cache.current.set(cacheKey, finalResult);
        return finalResult;
      }), [sourceSignal, log]);
    },

    /**
     * Slice items (create subarray)
     */
    slice(start = 0, end?: number): ReadonlySignal<ReadonlyArray<T>> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('slice', items.length);

        if (isEmpty(items)) return EMPTY.array as ReadonlyArray<T>;

        const result = items.slice(start, end);
        return isEmpty(result) ? EMPTY.array as ReadonlyArray<T> : result;
      }), [sourceSignal, start, end, log]);
    },

    /**
     * Take first n items
     */
    take(n: number): ReadonlySignal<ReadonlyArray<T>> {
      return this.slice(0, Math.max(0, n));
    },

    /**
     * Drop first n items
     */
    drop(n: number): ReadonlySignal<ReadonlyArray<T>> {
      return this.slice(Math.max(0, n));
    },

    /**
     * Find first item matching predicate
     */
    find(predicate: (item: T, index: number) => boolean): ReadonlySignal<T | undefined> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('find', items.length);

        if (isEmpty(items)) return undefined;

        return items.find(predicate);
      }), [sourceSignal, predicate, log]);
    },

    /**
     * Check if any item matches predicate
     */
    some(predicate: (item: T, index: number) => boolean): ReadonlySignal<boolean> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('some', items.length);

        if (isEmpty(items)) return false;

        return items.some(predicate);
      }), [sourceSignal, predicate, log]);
    },

    /**
     * Check if all items match predicate
     */
    every(predicate: (item: T, index: number) => boolean): ReadonlySignal<boolean> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('every', items.length);

        if (isEmpty(items)) return true;

        return items.every(predicate);
      }), [sourceSignal, predicate, log]);
    },

    /**
     * Reduce items to single value
     */
    reduce<U>(
      reducer: (acc: U, item: T, index: number) => U, 
      initialValue: U
    ): ReadonlySignal<U> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('reduce', items.length);

        if (isEmpty(items)) return initialValue;

        return items.reduce(reducer, initialValue);
      }), [sourceSignal, reducer, initialValue, log]);
    },

    /**
     * Group items by key function
     */
    groupBy<K>(keyFn: (item: T) => K): ReadonlySignal<ReadonlyMapType<K, ReadonlyArray<T>>> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('groupBy', items.length);

        if (isEmpty(items)) return EMPTY.map as ReadonlyMapType<K, ReadonlyArray<T>>;

        const cacheKey = { op: 'groupBy', items, fn: keyFn.toString() };
        const cached = cache.current.get(cacheKey);
        if (cached !== undefined) return cached;

        const groups = new Map<K, T[]>();
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const key = keyFn(item);
          const group = groups.get(key);
          
          if (group !== undefined) {
            group.push(item);
          } else {
            groups.set(key, [item]);
          }
        }

        // Freeze arrays for immutability
        const result = new Map<K, ReadonlyArray<T>>();
        for (const [key, groupItems] of groups.entries()) {
          result.set(key, Object.freeze(groupItems));
        }

        const frozenResult = Object.freeze(result);
        cache.current.set(cacheKey, frozenResult);
        return frozenResult as ReadonlyMapType<K, ReadonlyArray<T>>;
      }), [sourceSignal, keyFn, log]);
    },

    /**
     * Convert to Set
     */
    toSet(): ReadonlySignal<ReadonlySetType<T>> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('toSet', items.length);

        if (isEmpty(items)) return EMPTY.set as ReadonlySetType<T>;

        return new Set(items);
      }), [sourceSignal, log]);
    },

    /**
     * Apply custom transformation pipeline
     */
    pipe<U>(transform: (items: ReadonlyArray<T>) => U): ReadonlySignal<U> {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('pipe', items.length);

        return transform(items);
      }), [sourceSignal, transform, log]);
    },

    /**
     * Get collection length
     */
    length(): ReadonlySignal<number> {
      return useMemo(() => computed(() => sourceSignal.value.length), [sourceSignal]);
    },

    /**
     * Check if collection is empty
     */
    isEmpty(): ReadonlySignal<boolean> {
      return useMemo(() => computed(() => isEmpty(sourceSignal.value)), [sourceSignal]);
    },

    /**
     * Clear operation cache (useful for testing or memory management)
     */
    clearCache(): void {
      cache.current.clear();
    }
  };
}

// ============================================================================
// Computed Collections
// ============================================================================

/**
 * Create computed collection from multiple dependencies.
 * Uses TypeScript rest parameters for flexible dependency handling.
 * 
 * @template T - Result array element type
 * @template Deps - Tuple type of dependencies
 * @param compute - Function to compute result from dependencies
 * @param deps - Array of dependencies (readonly tuple)
 * @param options - Configuration options
 * @returns ReadonlySignal containing computed result
 * 
 * @example
 * ```tsx
 * const multiplier = 2;
 * const items = [1, 2, 3];
 * const doubled = useComputed(
 *   (mult, arr) => arr.map(x => x * mult),
 *   [multiplier, items]
 * );
 * ```
 */
export function useComputed<T, Deps extends readonly unknown[]>(
  compute: (...deps: Deps) => ReadonlyArray<T>,
  deps: readonly [...Deps],
  options?: CollectionOptions
): ReadonlySignal<ReadonlyArray<T>> {
  const { debug } = options ?? {};

  return useMemo(() => computed(() => {
    try {
      const result = compute(...(deps as [...Deps]));

      if (debug && process.env.NODE_ENV !== 'production') {
        console.log(`[useComputed] Computed ${result?.length ?? 0} items`);
      }

      return isEmpty(result) ? EMPTY.array as ReadonlyArray<T> : result;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[useComputed] Computation error:', error);
      }
      return EMPTY.array as ReadonlyArray<T>;
    }
  }), deps);
}

// ============================================================================
// Collection Combinators
// ============================================================================

/**
 * Combine multiple arrays into single array.
 * Supports both raw arrays and signals for flexible composition.
 * 
 * @template T - Array element type
 * @param sources - Variable number of arrays or signals
 * @returns ReadonlySignal containing combined array
 * 
 * @example
 * ```tsx
 * const items1 = [1, 2];
 * const items2 = signal([3, 4]);
 * const combined = useCombine(items1, items2); // [1, 2, 3, 4]
 * ```
 */
export function useCombine<T>(
  ...sources: readonly (ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>)[]
): ReadonlySignal<ReadonlyArray<T>> {
  return useMemo(() => computed(() => {
    const allItems: T[] = [];

    for (const source of sources) {
      const items = typeof source === 'object' && source !== null && 'value' in source 
        ? source.value 
        : source as ReadonlyArray<T>;
        
      if (!isEmpty(items)) {
        allItems.push(...items);
      }
    }

    return isEmpty(allItems) ? EMPTY.array as ReadonlyArray<T> : allItems;
  }), sources);
}

/**
 * Conditional collection selection based on boolean condition.
 * 
 * @template T - Array element type
 * @param condition - Boolean or signal determining which collection to use
 * @param truthyValue - Collection to use when condition is true
 * @param falsyValue - Collection to use when condition is false (default: empty array)
 * @returns ReadonlySignal containing selected collection
 * 
 * @example
 * ```tsx
 * const showActive = signal(true);
 * const result = useConditional(showActive, activeItems, inactiveItems);
 * ```
 */
export function useConditional<T>(
  condition: boolean | ReadonlySignal<boolean>,
  truthyValue: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>,
  falsyValue: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>> = EMPTY.array
): ReadonlySignal<ReadonlyArray<T>> {
  return useMemo(() => computed(() => {
    const cond = typeof condition === 'boolean' ? condition : condition.value;
    const truthy = typeof truthyValue === 'object' && truthyValue !== null && 'value' in truthyValue 
      ? truthyValue.value 
      : truthyValue as ReadonlyArray<T>;
    const falsy = typeof falsyValue === 'object' && falsyValue !== null && 'value' in falsyValue 
      ? falsyValue.value 
      : falsyValue as ReadonlyArray<T>;

    const result = cond ? truthy : falsy;
    return isEmpty(result) ? EMPTY.array as ReadonlyArray<T> : result;
  }), [condition, truthyValue, falsyValue]);
}

// ============================================================================
// Pagination Utility
// ============================================================================

/**
 * Pagination data interface
 */
interface PaginationData<T> {
  readonly items: ReadonlyArray<T>;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly startIndex: number;
  readonly endIndex: number;
}

/**
 * Paginate a collection with navigation controls.
 * 
 * @template T - Array element type
 * @param collection - Array or signal to paginate
 * @param pageSize - Number of items per page
 * @returns Pagination object with data signal and navigation functions
 * 
 * @example
 * ```tsx
 * const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const pagination = usePagination(items, 3);
 * 
 * // Access current page data
 * console.log(pagination.paginationData.value.items); // [1, 2, 3]
 * 
 * // Navigate
 * pagination.nextPage();
 * pagination.goToPage(2);
 * ```
 */
export function usePagination<T>(
  collection: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>,
  pageSize: number
) {
  const currentPage = useMemo(() => signal(0), []);

  const paginationData = useMemo(() => computed<PaginationData<T>>(() => {
    const items = typeof collection === 'object' && collection !== null && 'value' in collection 
      ? collection.value 
      : collection as ReadonlyArray<T>;

    if (isEmpty(items)) {
      return {
        items: EMPTY.array as ReadonlyArray<T>,
        totalItems: 0,
        totalPages: 0,
        currentPage: 0,
        hasNextPage: false,
        hasPreviousPage: false,
        startIndex: 0,
        endIndex: 0
      };
    }

    const totalPages = Math.ceil(items.length / pageSize);
    const page = Math.max(0, Math.min(currentPage.value, totalPages - 1));
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, items.length);
    const pageItems = items.slice(startIndex, endIndex);

    return {
      items: pageItems,
      totalItems: items.length,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
      startIndex,
      endIndex
    };
  }), [collection, pageSize, currentPage]);

  const goToPage = useCallback((page: number) => {
    currentPage.value = Math.max(0, page);
  }, [currentPage]);

  const nextPage = useCallback(() => {
    if (paginationData.value.hasNextPage) {
      currentPage.value = currentPage.value + 1;
    }
  }, [currentPage, paginationData]);

  const previousPage = useCallback(() => {
    if (paginationData.value.hasPreviousPage) {
      currentPage.value = currentPage.value - 1;
    }
  }, [currentPage, paginationData]);

  return {
    paginationData,
    currentPage,
    goToPage,
    nextPage,
    previousPage
  } as const;
}

// ============================================================================
// Standalone Transform Functions
// ============================================================================

/**
 * Standalone filter function
 */
export const filter = <T>(
  items: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>, 
  predicate: (item: T) => boolean
): ReadonlySignal<ReadonlyArray<T>> => useTransform(items).filter(predicate);

/**
 * Standalone map function
 */
export const map = <T, U>(
  items: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>, 
  mapper: (item: T) => U
): ReadonlySignal<ReadonlyArray<U>> => useTransform(items).map(mapper);

/**
 * Standalone sort function
 */
export const sort = <T>(
  items: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>, 
  compareFn?: (a: T, b: T) => number
): ReadonlySignal<ReadonlyArray<T>> => useTransform(items).sort(compareFn);

/**
 * Standalone unique function
 */
export const unique = <T>(
  items: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>
): ReadonlySignal<ReadonlyArray<T>> => useTransform(items).unique();

/**
 * Standalone groupBy function
 */
export const groupBy = <T, K>(
  items: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>, 
  keyFn: (item: T) => K
): ReadonlySignal<ReadonlyMapType<K, ReadonlyArray<T>>> => useTransform(items).groupBy(keyFn);

/**
 * Standalone reduce function
 */
export const reduce = <T, U>(
  items: ReadonlyArray<T> | ReadonlySignal<ReadonlyArray<T>>, 
  reducer: (acc: U, item: T) => U, 
  initialValue: U
): ReadonlySignal<U> => useTransform(items).reduce(reducer, initialValue);

// ============================================================================
// Exports
// ============================================================================

export type { 
  CollectionOptions, 
  PaginationData,
  ReadonlyArray, 
  ReadonlySetType, 
  ReadonlyMapType 
};
