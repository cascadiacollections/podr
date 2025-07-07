import { computed, ReadonlySignal, signal } from '@preact/signals';
import { useCallback, useMemo, useRef } from 'preact/hooks';

// Simplified types
type AnyArray<T = any> = readonly T[];
type AnySet<T = any> = ReadonlySet<T>;
type AnyMap<K = any, V = any> = ReadonlyMap<K, V>;

// Core configuration
interface CollectionOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum cache size for memoized operations */
  cacheSize?: number;
}

// Global empty singletons
const EMPTY = {
  array: Object.freeze([]) as readonly never[],
  set: Object.freeze(new Set()) as ReadonlySet<unknown>,
  map: Object.freeze(new Map()) as ReadonlyMap<unknown, unknown>
};

// Performance helper
const isEmpty = (collection: any): boolean => {
  return collection?.size === 0 || collection?.length === 0;
};

/**
 * LRU Cache for expensive operations
 */
class LRUCache<K, V> {
  private cache = new Map<string, V>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const strKey = JSON.stringify(key);
    const value = this.cache.get(strKey);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(strKey);
      this.cache.set(strKey, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    const strKey = JSON.stringify(key);

    if (this.cache.has(strKey)) {
      this.cache.delete(strKey);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(strKey, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Create a reactive signal from any collection.
 * Empty collections automatically use shared singleton references.
 */
export function useCollection<T>(items: readonly T[], options?: CollectionOptions): ReadonlySignal<readonly T[]>;
export function useCollection<T>(items: ReadonlySet<T>, options?: CollectionOptions): ReadonlySignal<ReadonlySet<T>>;
export function useCollection<K, V>(items: ReadonlyMap<K, V>, options?: CollectionOptions): ReadonlySignal<ReadonlyMap<K, V>>;
export function useCollection<T>(items: any, options?: CollectionOptions): ReadonlySignal<any> {
  const { debug } = options || {};

  return useMemo(() => {
    return computed(() => {
      if (debug && process.env.NODE_ENV !== 'production') {
        const size = items?.size ?? items?.length ?? 0;
        console.log(`[useCollection] Updated with ${size} items`);
      }

      if (isEmpty(items)) {
        if (Array.isArray(items)) return EMPTY.array;
        if (items instanceof Set) return EMPTY.set;
        if (items instanceof Map) return EMPTY.map;
      }

      return items;
    });
  }, [items, debug]);
}

/**
 * Enhanced transform API with signals-first approach and performance optimizations.
 */
export function useTransform<T>(
  source: readonly T[] | ReadonlySignal<readonly T[]>,
  options?: CollectionOptions
) {
  const { cacheSize = 100, debug } = options || {};

  // Convert input to signal if needed
  const sourceSignal = useMemo(() => {
    if (typeof source === 'object' && 'value' in source) {
      return source as ReadonlySignal<readonly T[]>;
    }
    return signal(source as readonly T[]);
  }, [source]);

  // Shared cache for expensive operations
  const cache = useRef(new LRUCache(cacheSize));

  const log = useCallback((operation: string, count: number) => {
    if (debug && process.env.NODE_ENV !== 'production') {
      console.log(`[useTransform] ${operation}: ${count} items`);
    }
  }, [debug]);

  return {
    // Core reactive source
    source: sourceSignal,

    /**
     * Filter items reactively
     */
    filter(predicate: (item: T, index: number) => boolean) {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('filter', items.length);

        if (isEmpty(items)) return EMPTY.array as readonly T[];

        const cacheKey = { op: 'filter', items, predicate: predicate.toString() };
        const cached = cache.current.get(cacheKey);
        if (cached) return cached;

        const result = items.filter(predicate);
        cache.current.set(cacheKey, result);
        return result;
      }), [sourceSignal, predicate, log]);
    },

    /**
     * Map items to new values
     */
    map<U>(mapper: (item: T, index: number) => U) {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('map', items.length);

        if (isEmpty(items)) return EMPTY.array as readonly U[];

        const cacheKey = { op: 'map', items, mapper: mapper.toString() };
        const cached = cache.current.get(cacheKey);
        if (cached) return cached;

        const result = items.map(mapper);
        cache.current.set(cacheKey, result);
        return result;
      }), [sourceSignal, mapper, log]);
    },

    /**
     * Sort items
     */
    sort(compareFn?: (a: T, b: T) => number) {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('sort', items.length);

        if (isEmpty(items)) return EMPTY.array as readonly T[];

        const cacheKey = { op: 'sort', items, compare: compareFn?.toString() || 'default' };
        const cached = cache.current.get(cacheKey);
        if (cached) return cached;

        const result = [...items].sort(compareFn);
        cache.current.set(cacheKey, result);
        return result;
      }), [sourceSignal, compareFn, log]);
    },

    /**
     * Get unique items
     */
    unique() {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('unique', items.length);

        if (isEmpty(items)) return EMPTY.array as readonly T[];

        const cacheKey = { op: 'unique', items };
        const cached = cache.current.get(cacheKey);
        if (cached) return cached;

        const seen = new Set<T>();
        const result = items.filter(item => {
          if (seen.has(item)) return false;
          seen.add(item);
          return true;
        });

        cache.current.set(cacheKey, result);
        return result;
      }), [sourceSignal, log]);
    },

    /**
     * Slice items
     */
    slice(start = 0, end?: number) {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('slice', items.length);

        if (isEmpty(items)) return EMPTY.array as readonly T[];

        const result = items.slice(start, end);
        return isEmpty(result) ? EMPTY.array as readonly T[] : result;
      }), [sourceSignal, start, end, log]);
    },

    /**
     * Take first n items
     */
    take(n: number) {
      return this.slice(0, Math.max(0, n));
    },

    /**
     * Drop first n items
     */
    drop(n: number) {
      return this.slice(Math.max(0, n));
    },

    /**
     * Find first item matching predicate
     */
    find(predicate: (item: T, index: number) => boolean) {
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
    some(predicate: (item: T, index: number) => boolean) {
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
    every(predicate: (item: T, index: number) => boolean) {
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
    reduce<U>(reducer: (acc: U, item: T, index: number) => U, initialValue: U) {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('reduce', items.length);

        if (isEmpty(items)) return initialValue;

        return items.reduce(reducer, initialValue);
      }), [sourceSignal, reducer, initialValue, log]);
    },

    /**
     * Group items by key
     */
    groupBy<K>(keyFn: (item: T) => K) {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('groupBy', items.length);

        if (isEmpty(items)) return EMPTY.map as ReadonlyMap<K, readonly T[]>;

        const cacheKey = { op: 'groupBy', items, keyFn: keyFn.toString() };
        const cached = cache.current.get(cacheKey);
        if (cached) return cached;

        const groups = new Map<K, T[]>();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const key = keyFn(item);
          const group = groups.get(key);
          if (group) {
            group.push(item);
          } else {
            groups.set(key, [item]);
          }
        }

        // Freeze arrays for immutability
        const result = new Map<K, readonly T[]>();
        for (const [key, items] of groups) {
          result.set(key, Object.freeze(items));
        }

        cache.current.set(cacheKey, result);
        return result;
      }), [sourceSignal, keyFn, log]);
    },

    /**
     * Convert to Set
     */
    toSet() {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('toSet', items.length);

        if (isEmpty(items)) return EMPTY.set as ReadonlySet<T>;

        return new Set(items);
      }), [sourceSignal, log]);
    },

    /**
     * Apply custom transformation
     */
    pipe<U>(transform: (items: readonly T[]) => U) {
      return useMemo(() => computed(() => {
        const items = sourceSignal.value;
        log('pipe', items.length);

        return transform(items);
      }), [sourceSignal, transform, log]);
    },

    /**
     * Get length/size
     */
    length() {
      return useMemo(() => computed(() => {
        return sourceSignal.value.length;
      }), [sourceSignal]);
    },

    /**
     * Check if collection is empty
     */
    isEmpty() {
      return useMemo(() => computed(() => {
        return isEmpty(sourceSignal.value);
      }), [sourceSignal]);
    },

    /**
     * Clear operation cache
     */
    clearCache() {
      cache.current.clear();
    }
  };
}

/**
 * Simplified computed collection from multiple sources
 */
export function useComputed<T, Deps extends readonly unknown[]>(
  compute: (...deps: Deps) => readonly T[],
  deps: readonly [...Deps],
  options?: CollectionOptions
): ReadonlySignal<readonly T[]> {
  const { debug } = options || {};

  return useMemo(() => computed(() => {
    try {
      const result = compute(...(deps as [...Deps]));

      if (debug && process.env.NODE_ENV !== 'production') {
        console.log(`[useComputed] Computed ${result?.length || 0} items`);
      }

      return isEmpty(result) ? EMPTY.array as readonly T[] : result;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[useComputed] Error:`, error);
      }
      return EMPTY.array as readonly T[];
    }
  }), deps);
}

/**
 * Combine multiple arrays efficiently
 */
export function useCombine<T>(...sources: readonly (readonly T[] | ReadonlySignal<readonly T[]>)[]): ReadonlySignal<readonly T[]> {
  return useMemo(() => computed(() => {
    const allItems: T[] = [];

    for (const source of sources) {
      const items = typeof source === 'object' && 'value' in source ? source.value : source as readonly T[];
      if (!isEmpty(items)) {
        allItems.push(...items);
      }
    }

    return isEmpty(allItems) ? EMPTY.array as readonly T[] : allItems;
  }), sources);
}

/**
 * Conditional collection with reactive condition
 */
export function useConditional<T>(
  condition: boolean | ReadonlySignal<boolean>,
  truthyValue: readonly T[] | ReadonlySignal<readonly T[]>,
  falsyValue: readonly T[] | ReadonlySignal<readonly T[]> = EMPTY.array as readonly T[]
): ReadonlySignal<readonly T[]> {
  return useMemo(() => computed(() => {
    const cond = typeof condition === 'boolean' ? condition : condition.value;
    const truthy = typeof truthyValue === 'object' && 'value' in truthyValue ? truthyValue.value : truthyValue as readonly T[];
    const falsy = typeof falsyValue === 'object' && 'value' in falsyValue ? falsyValue.value : falsyValue as readonly T[];

    const result = cond ? truthy : falsy;
    return isEmpty(result) ? EMPTY.array as readonly T[] : result;
  }), [condition, truthyValue, falsyValue]);
}

/**
 * Track changes in collections
 */
export function useChanges<T>(
  collection: readonly T[] | ReadonlySignal<readonly T[]>,
  isEqual?: (a: readonly T[], b: readonly T[]) => boolean
): ReadonlySignal<{
  current: readonly T[];
  previous: readonly T[] | undefined;
  hasChanged: boolean;
  added: readonly T[];
  removed: readonly T[];
}> {
  const prevRef = useRef<readonly T[]>();

  return useMemo(() => computed(() => {
    const current = typeof collection === 'object' && 'value' in collection ? collection.value : collection as readonly T[];
    const previous = prevRef.current;

    let hasChanged = true;
    let added: readonly T[] = EMPTY.array;
    let removed: readonly T[] = EMPTY.array;

    if (previous !== undefined) {
      hasChanged = isEqual ? !isEqual(previous, current) : previous !== current;

      if (hasChanged && !isEqual) {
        // Calculate diff for non-custom equality
        const prevSet = new Set(previous);
        const currSet = new Set(current);

        added = current.filter(item => !prevSet.has(item));
        removed = previous.filter(item => !currSet.has(item));
      }
    }

    prevRef.current = current;

    return {
      current,
      previous,
      hasChanged,
      added,
      removed
    };
  }), [collection, isEqual]);
}

/**
 * Paginate a collection
 */
export function usePagination<T>(
  collection: readonly T[] | ReadonlySignal<readonly T[]>,
  pageSize: number
) {
  const currentPage = useMemo(() => signal(0), []);

  const paginationData = useMemo(() => computed(() => {
    const items = typeof collection === 'object' && 'value' in collection ? collection.value : collection as readonly T[];

    if (isEmpty(items)) {
      return {
        items: EMPTY.array as readonly T[],
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
  };
}

// Simplified standalone exports
export const filter = <T>(items: readonly T[] | ReadonlySignal<readonly T[]>, predicate: (item: T) => boolean) =>
  useTransform(items).filter(predicate);

export const map = <T, U>(items: readonly T[] | ReadonlySignal<readonly T[]>, mapper: (item: T) => U) =>
  useTransform(items).map(mapper);

export const sort = <T>(items: readonly T[] | ReadonlySignal<readonly T[]>, compareFn?: (a: T, b: T) => number) =>
  useTransform(items).sort(compareFn);

export const unique = <T>(items: readonly T[] | ReadonlySignal<readonly T[]>) =>
  useTransform(items).unique();

export const groupBy = <T, K>(items: readonly T[] | ReadonlySignal<readonly T[]>, keyFn: (item: T) => K) =>
  useTransform(items).groupBy(keyFn);

export const reduce = <T, U>(items: readonly T[] | ReadonlySignal<readonly T[]>, reducer: (acc: U, item: T) => U, initialValue: U) =>
  useTransform(items).reduce(reducer, initialValue);

// Export types
export type { AnyArray, AnyMap, AnySet, CollectionOptions };
