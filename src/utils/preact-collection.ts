/**
 * @fileoverview Advanced collection management hook for Preact applications
 * 
 * This module provides a comprehensive collection management solution with:
 * - Immutable collections with type safety
 * - Rich mutation and query operations
 * - Functional programming utilities
 * - Performance optimizations with memoization
 * - Preact-specific integrations (Context, Signals)
 * - External API synchronization
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const todos = useCollection<Todo>([
 *   { id: 1, text: 'Learn Preact', completed: false }
 * ]);
 * 
 * // Add items
 * todos.add({ id: 2, text: 'Build app', completed: false });
 * 
 * // Filter and transform
 * const completed = todos.filter(todo => todo.completed);
 * const priorities = todos.groupBy(todo => todo.priority);
 * ```
 */

/** @jsx h */
import type { ComponentChildren } from 'preact';
import { createContext, h } from 'preact';
import { useCallback, useContext, useMemo, useRef, useState } from 'preact/hooks';

// Stable empty array reference with const assertion
const EMPTY_ARRAY = [] as const;

/**
 * Branded type for type-safe immutable collections.
 * Prevents accidental mutation while providing array-like access.
 * @template T - The type of items in the collection
 */
declare const __CollectionBrand: unique symbol;
type Collection<T> = readonly T[] & { readonly [__CollectionBrand]: true };

/**
 * Predicate function type for filtering operations.
 * @template T - The type of items being tested
 * @param item - The item to test
 * @param index - The index of the item in the collection
 * @returns True if the item matches the predicate
 */
type Predicate<T> = (item: T, index: number) => boolean;

/**
 * Type guard predicate for filtering with type narrowing.
 * @template T - The original type
 * @template U - The narrowed type (must extend T)
 * @param item - The item to test and narrow
 * @param index - The index of the item in the collection
 * @returns True if the item is of type U
 */
type TypeGuardPredicate<T, U extends T> = (item: T, index: number) => item is U;

/**
 * Mapper function type for transformation operations.
 * @template T - The input type
 * @template U - The output type
 * @param item - The item to transform
 * @param index - The index of the item in the collection
 * @returns The transformed item
 */
type Mapper<T, U> = (item: T, index: number) => U;

/**
 * Reducer function type for aggregation operations.
 * @template T - The type of items being reduced
 * @template U - The type of the accumulator
 * @param accumulator - The accumulated value
 * @param item - The current item
 * @param index - The index of the current item
 * @returns The updated accumulator
 */
type Reducer<T, U> = (accumulator: U, item: T, index: number) => U;

/**
 * Comparator function type for sorting operations.
 * @template T - The type of items being compared
 * @param a - First item to compare
 * @param b - Second item to compare
 * @returns Negative if a < b, positive if a > b, zero if equal
 */
type Comparator<T> = (a: T, b: T) => number;

/**
 * Equality function type for custom item comparison.
 * @template T - The type of items being compared
 * @param a - First item to compare
 * @param b - Second item to compare
 * @returns True if items are considered equal
 */
type EqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Overloaded add method type supporting both append and insert operations.
 * @template T - The type of items in the collection
 */
type AddMethod<T> = {
  /** Add item to the end of the collection */
  (item: T): boolean;
  /** Insert item at the specified index */
  (index: number, item: T): boolean;
} & ((indexOrItem: number | T, item?: T) => boolean);

/**
 * Overloaded addAll method type supporting both append and insert operations.
 * @template T - The type of items in the collection
 */
type AddAllMethod<T> = {
  /** Add all items to the end of the collection */
  (items: readonly T[]): boolean;
  /** Insert all items at the specified index */
  (index: number, items: readonly T[]): boolean;
} & ((indexOrItems: number | readonly T[], items?: readonly T[]) => boolean);

/**
 * Configuration options for the useCollection hook.
 * @template T - The type of items in the collection
 */
export interface UseCollectionOptions<T> {
  /**
   * Custom equality function for comparing items.
   * @default Object.is
   */
  readonly equalityFn?: EqualityFn<T>;
  
  /**
   * Callback invoked before any change is applied.
   * Can prevent the change by returning false.
   * @param prevItems - The current collection state
   * @param newItems - The proposed new collection state
   * @returns False to prevent the change, true/undefined to allow it
   */
  readonly onBeforeChange?: (
    prevItems: Collection<T>,
    newItems: Collection<T>
  ) => boolean | void;
  
  /**
   * Callback invoked after a change has been applied.
   * @param prevItems - The previous collection state
   * @param newItems - The new collection state
   */
  readonly onAfterChange?: (
    prevItems: Collection<T>,
    newItems: Collection<T>
  ) => void;
}

/**
 * Return type of the useCollection hook providing comprehensive collection operations.
 * All mutation operations return boolean indicating if the collection was modified.
 * Query operations are read-only and don't trigger re-renders.
 * 
 * @template T - The type of items in the collection
 * 
 * @example
 * ```tsx
 * const collection = useCollection<string>(['a', 'b', 'c']);
 * 
 * // Mutation operations
 * collection.add('d');           // Append item
 * collection.add(1, 'x');        // Insert at index
 * collection.remove('b');        // Remove by value
 * collection.removeAt(0);        // Remove by index
 * 
 * // Query operations
 * const item = collection.get(0);      // Get by index
 * const hasItem = collection.contains('a'); // Check existence
 * const filtered = collection.filter(item => item > 'b'); // Transform
 * 
 * // Functional operations
 * const mapped = collection.map(item => item.toUpperCase());
 * const grouped = collection.groupBy(item => item.charAt(0));
 * ```
 */
export interface UseCollectionReturn<T> {
  // Core properties
  
  /** 
   * Immutable collection of items. Safe to pass as props without causing re-renders.
   * @readonly
   */
  readonly items: Collection<T>;
  
  /** 
   * Number of items in the collection.
   * @readonly
   */
  readonly size: number;
  
  /** 
   * True if the collection contains no items.
   * @readonly
   */
  readonly isEmpty: boolean;

  // Mutation operations
  
  /**
   * Add an item to the collection.
   * @param item - Item to add to the end of the collection
   * @returns True if the collection was modified
   * 
   * @overload
   * @param index - Position to insert the item
   * @param item - Item to insert
   * @returns True if the collection was modified
   * 
   * @example
   * ```tsx
   * collection.add('new item');        // Append to end
   * collection.add(2, 'inserted');     // Insert at index 2
   * ```
   */
  readonly add: AddMethod<T>;
  
  /**
   * Add multiple items to the collection.
   * @param items - Items to add to the end of the collection
   * @returns True if the collection was modified
   * 
   * @overload
   * @param index - Position to insert the items
   * @param items - Items to insert
   * @returns True if the collection was modified
   * 
   * @example
   * ```tsx
   * collection.addAll(['a', 'b', 'c']);    // Append to end
   * collection.addAll(1, ['x', 'y']);      // Insert at index 1
   * ```
   */
  readonly addAll: AddAllMethod<T>;
  
  /**
   * Remove the first occurrence of an item from the collection.
   * @param item - Item to remove (uses equality function for comparison)
   * @returns True if an item was removed
   * 
   * @example
   * ```tsx
   * const removed = collection.remove('target'); // true if found and removed
   * ```
   */
  readonly remove: (item: T) => boolean;
  
  /**
   * Remove the item at the specified index.
   * @param index - Index of the item to remove
   * @returns The removed item, or undefined if index is invalid
   * 
   * @example
   * ```tsx
   * const removed = collection.removeAt(2); // Remove item at index 2
   * ```
   */
  readonly removeAt: (index: number) => T | undefined;
  
  /**
   * Remove all occurrences of the specified items from the collection.
   * @param items - Items to remove
   * @returns True if any items were removed
   * 
   * @example
   * ```tsx
   * collection.removeAll(['a', 'b']); // Remove all 'a' and 'b' items
   * ```
   */
  readonly removeAll: (items: readonly T[]) => boolean;
  
  /**
   * Remove all items that match the predicate.
   * @param predicate - Function to test each item
   * @returns True if any items were removed
   * 
   * @example
   * ```tsx
   * collection.removeIf(item => item.startsWith('temp')); // Remove temp items
   * ```
   */
  readonly removeIf: (predicate: Predicate<T>) => boolean;
  
  /**
   * Replace the item at the specified index.
   * @param index - Index of the item to replace
   * @param item - New item to set
   * @returns The previous item, or undefined if index is invalid
   * 
   * @example
   * ```tsx
   * const previous = collection.set(1, 'new value'); // Replace item at index 1
   * ```
   */
  readonly set: (index: number, item: T) => T | undefined;
  
  /**
   * Remove all items from the collection.
   * @returns True if the collection was not already empty
   * 
   * @example
   * ```tsx
   * collection.clear(); // Empty the collection
   * ```
   */
  /**
   * Remove all items from the collection.
   * @returns True if the collection was not already empty
   * 
   * @example
   * ```tsx
   * collection.clear(); // Empty the collection
   * ```
   */
  readonly clear: () => boolean;

  // Transformation operations
  
  /**
   * Create a new array with items that pass the predicate test.
   * Supports type narrowing with type guard predicates.
   * @param predicate - Function to test each item
   * @returns New array with filtered items
   * 
   * @example
   * ```tsx
   * const numbers = collection.filter(item => typeof item === 'number');
   * const active = collection.filter(item => item.isActive);
   * ```
   */
  readonly filter: {
    <U extends T>(predicate: TypeGuardPredicate<T, U>): U[];
    (predicate: Predicate<T>): T[];
  };
  
  /**
   * Create a new array with the results of calling a mapper function on every item.
   * @param mapper - Function to transform each item
   * @returns New array with transformed items
   * 
   * @example
   * ```tsx
   * const names = collection.map(user => user.name);
   * const doubled = collection.map(num => num * 2);
   * ```
   */
  readonly map: <U>(mapper: Mapper<T, U>) => U[];
  
  /**
   * Create a new array with sub-array elements concatenated into it recursively.
   * @param mapper - Function that returns an array for each item
   * @returns Flattened array
   * 
   * @example
   * ```tsx
   * const tags = collection.flatMap(item => item.tags);
   * const children = collection.flatMap(node => node.children);
   * ```
   */
  readonly flatMap: <U>(mapper: Mapper<T, readonly U[]>) => U[];
  
  /**
   * Execute a reducer function on each item, resulting in a single output value.
   * @param reducer - Function to execute on each item
   * @param initialValue - Initial value for the accumulator
   * @returns The final accumulator value
   * 
   * @example
   * ```tsx
   * const sum = collection.reduce((acc, num) => acc + num, 0);
   * const max = collection.reduce((acc, item) => Math.max(acc, item.value), 0);
   * ```
   */
  readonly reduce: <U>(reducer: Reducer<T, U>, initialValue: U) => U;

  // Query operations
  
  /**
   * Get the item at the specified index.
   * @param index - Index of the item to retrieve
   * @returns The item at the index, or undefined if index is invalid
   * 
   * @example
   * ```tsx
   * const first = collection.get(0);
   * const last = collection.get(collection.size - 1);
   * ```
   */
  readonly get: (index: number) => T | undefined;
  
  /**
   * Find the first index of the specified item.
   * @param item - Item to search for (uses equality function)
   * @returns Index of the item, or -1 if not found
   * 
   * @example
   * ```tsx
   * const index = collection.indexOf('target');
   * ```
   */
  readonly indexOf: (item: T) => number;
  
  /**
   * Find the last index of the specified item.
   * @param item - Item to search for (uses equality function)
   * @returns Last index of the item, or -1 if not found
   * 
   * @example
   * ```tsx
   * const lastIndex = collection.lastIndexOf('duplicate');
   * ```
   */
  readonly lastIndexOf: (item: T) => number;
  
  /**
   * Check if the collection contains the specified item.
   * @param item - Item to search for (uses equality function)
   * @returns True if the item is found
   * 
   * @example
   * ```tsx
   * const hasItem = collection.contains('target');
   * ```
   */
  readonly contains: (item: T) => boolean;
  
  /**
   * Check if the collection contains all of the specified items.
   * @param items - Items to search for
   * @returns True if all items are found
   * 
   * @example
   * ```tsx
   * const hasAll = collection.containsAll(['a', 'b', 'c']);
   * ```
   */
  readonly containsAll: (items: readonly T[]) => boolean;

  // Bulk operations
  
  /**
   * Remove all items except those in the specified array.
   * @param items - Items to keep in the collection
   * @returns True if any items were removed
   * 
   * @example
   * ```tsx
   * collection.retainAll(['keep1', 'keep2']); // Remove everything else
   * ```
   */
  readonly retainAll: (items: readonly T[]) => boolean;

  // List operations
  
  /**
   * Create a shallow copy of a portion of the collection.
   * @param fromIndex - Start index (inclusive)
   * @param toIndex - End index (exclusive)
   * @returns New array containing the selected items
   * 
   * @example
   * ```tsx
   * const middle = collection.subList(2, 5); // Items from index 2 to 4
   * ```
   */
  readonly subList: (fromIndex: number, toIndex: number) => T[];

  // Utility operations
  
  /**
   * Sort the collection items in place.
   * @param compareFn - Optional comparison function
   * @returns True if the collection was modified
   * 
   * @example
   * ```tsx
   * collection.sort(); // Default sort
   * collection.sort((a, b) => a.name.localeCompare(b.name)); // Custom sort
   * ```
   */
  readonly sort: (compareFn?: Comparator<T>) => boolean;
  
  /**
   * Reverse the order of items in the collection.
   * @returns True if the collection was modified
   * 
   * @example
   * ```tsx
   * collection.reverse(); // Reverse the order
   * ```
   */
  readonly reverse: () => boolean;
  
  /**
   * Randomly shuffle the items in the collection.
   * @returns True if the collection was modified
   * 
   * @example
   * ```tsx
   * collection.shuffle(); // Randomize the order
   * ```
   */
  readonly shuffle: () => boolean;

  // Iterator operations
  
  /**
   * Execute a function for each item in the collection.
   * @param action - Function to execute for each item
   * 
   * @example
   * ```tsx
   * collection.forEach((item, index) => console.log(`${index}: ${item}`));
   * ```
   */
  readonly forEach: (action: (item: T, index: number) => void) => void;
  
  /**
   * Find the first item that matches the predicate.
   * Supports type narrowing with type guard predicates.
   * @param predicate - Function to test each item
   * @returns The first matching item, or undefined if none found
   * 
   * @example
   * ```tsx
   * const user = collection.find(item => item.id === targetId);
   * const admin = collection.find(item => item.role === 'admin');
   * ```
   */
  readonly find: {
    <U extends T>(predicate: TypeGuardPredicate<T, U>): U | undefined;
    (predicate: Predicate<T>): T | undefined;
  };
  
  /**
   * Find the index of the first item that matches the predicate.
   * @param predicate - Function to test each item
   * @returns Index of the first matching item, or -1 if none found
   * 
   * @example
   * ```tsx
   * const index = collection.findIndex(item => item.name === 'target');
   * ```
   */
  readonly findIndex: (predicate: Predicate<T>) => number;
  
  /**
   * Test whether at least one item matches the predicate.
   * @param predicate - Function to test each item
   * @returns True if any item matches the predicate
   * 
   * @example
   * ```tsx
   * const hasActive = collection.some(item => item.isActive);
   * ```
   */
  readonly some: (predicate: Predicate<T>) => boolean;
  
  /**
   * Test whether all items match the predicate.
   * @param predicate - Function to test each item
   * @returns True if all items match the predicate
   * 
   * @example
   * ```tsx
   * const allValid = collection.every(item => item.isValid);
   * ```
   */
  readonly every: (predicate: Predicate<T>) => boolean;

  // Advanced operations
  
  /**
   * Split the collection into two arrays based on a predicate.
   * Supports type narrowing with type guard predicates.
   * @param predicate - Function to test each item
   * @returns Tuple of [matching items, non-matching items]
   * 
   * @example
   * ```tsx
   * const [active, inactive] = collection.partition(item => item.isActive);
   * const [admins, users] = collection.partition(item => item.role === 'admin');
   * ```
   */
  readonly partition: {
    <U extends T>(predicate: TypeGuardPredicate<T, U>): readonly [U[], Exclude<T, U>[]];
    (predicate: Predicate<T>): readonly [T[], T[]];
  };
  
  /**
   * Group items by a key selector function.
   * @param keySelector - Function to extract the grouping key
   * @returns Object with keys as groups and values as arrays of items
   * 
   * @example
   * ```tsx
   * const byCategory = collection.groupBy(item => item.category);
   * const byFirstLetter = collection.groupBy(name => name.charAt(0));
   * ```
   */
  readonly groupBy: <K extends PropertyKey>(keySelector: (item: T) => K) => Record<K, T[]>;
  
  /**
   * Get unique items from the collection.
   * @param keySelector - Optional function to extract comparison key
   * @returns Array of unique items
   * 
   * @example
   * ```tsx
   * const unique = collection.distinct(); // Remove duplicates
   * const uniqueNames = collection.distinct(item => item.name); // Unique by name
   * ```
   */
  readonly distinct: (keySelector?: (item: T) => unknown) => T[];
  
  /**
   * Get unique items from the collection based on a key selector.
   * @param keySelector - Function to extract the uniqueness key
   * @returns Array of unique items
   * 
   * @example
   * ```tsx
   * const uniqueUsers = collection.distinctBy(user => user.email);
   * ```
   */
  readonly distinctBy: <K>(keySelector: (item: T) => K) => T[];
  
  /**
   * Split the collection into chunks of the specified size.
   * @param size - Size of each chunk
   * @returns Array of arrays, each containing up to 'size' items
   * 
   * @example
   * ```tsx
   * const pages = collection.chunk(10); // Split into pages of 10 items
   * ```
   */
  readonly chunk: (size: number) => T[][];
  
  /**
   * Take items from the beginning while the predicate is true.
   * @param predicate - Function to test each item
   * @returns Array of items taken from the beginning
   * 
   * @example
   * ```tsx
   * const leadingZeros = collection.takeWhile(num => num === 0);
   * ```
   */
  readonly takeWhile: (predicate: Predicate<T>) => T[];
  
  /**
   * Skip items from the beginning while the predicate is true.
   * @param predicate - Function to test each item
   * @returns Array of remaining items after skipping
   * 
   * @example
   * ```tsx
   * const withoutLeadingZeros = collection.dropWhile(num => num === 0);
   * ```
   */
  readonly dropWhile: (predicate: Predicate<T>) => T[];
  
  /**
   * Combine this collection with another array into pairs.
   * @param other - Array to combine with
   * @returns Array of tuples, limited by the shorter array
   * 
   * @example
   * ```tsx
   * const pairs = collection.zip(['a', 'b', 'c']); // [[item1, 'a'], [item2, 'b'], ...]
   * ```
   */
  readonly zip: <U>(other: readonly U[]) => Array<readonly [T, U]>;

  // Conversion operations
  
  /**
   * Convert the collection to a regular array.
   * @returns New array containing all items
   * 
   * @example
   * ```tsx
   * const array = collection.toArray();
   * ```
   */
  readonly toArray: () => T[];
  
  /**
   * Convert the collection to a Set.
   * @returns New Set containing all unique items
   * 
   * @example
   * ```tsx
   * const uniqueSet = collection.toSet();
   * ```
   */
  readonly toSet: () => Set<T>;
  
  /**
   * Convert the collection to a Map using a key selector.
   * @param keySelector - Function to extract the key for each item
   * @returns New Map with selected keys and items as values
   * 
   * @example
   * ```tsx
   * const userMap = collection.toMap(user => user.id);
   * ```
   */
  readonly toMap: <K>(keySelector: (item: T) => K) => Map<K, T>;
}

/**
 * Advanced collection management hook for Preact applications.
 * 
 * Provides a comprehensive set of operations for managing collections with:
 * - Immutable, type-safe collection state
 * - Rich mutation operations (add, remove, update)
 * - Functional programming utilities (map, filter, reduce)
 * - Performance optimizations with change detection
 * - Lifecycle hooks for before/after change events
 * - Custom equality comparison support
 * 
 * @template T - The type of items in the collection
 * @param initialItems - Initial items to populate the collection
 * @param options - Configuration options for the collection behavior
 * @returns Collection interface with all available operations
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const todos = useCollection<Todo>([
 *   { id: 1, text: 'Learn Preact', completed: false }
 * ]);
 * 
 * // Add items
 * todos.add({ id: 2, text: 'Build app', completed: false });
 * todos.addAll([todo3, todo4]);
 * 
 * // Query and transform
 * const completed = todos.filter(todo => todo.completed);
 * const byPriority = todos.groupBy(todo => todo.priority);
 * 
 * // Mutation operations
 * todos.removeIf(todo => todo.completed);
 * todos.sort((a, b) => a.priority - b.priority);
 * ```
 * 
 * @example
 * ```tsx
 * // With custom equality and lifecycle hooks
 * const users = useCollection<User>([], {
 *   equalityFn: (a, b) => a.id === b.id,
 *   onBeforeChange: (prev, next) => {
 *     console.log(`Changing from ${prev.length} to ${next.length} items`);
 *     return true; // Allow the change
 *   },
 *   onAfterChange: (prev, next) => {
 *     // Sync to external API, analytics, etc.
 *     saveToAPI(next);
 *   }
 * });
 * ```
 */
export function useCollection<T>(
  initialItems: readonly T[] = EMPTY_ARRAY,
  options: UseCollectionOptions<T> = {} as const
): UseCollectionReturn<T> {
  const {
    equalityFn = Object.is,
    onBeforeChange,
    onAfterChange,
  } = options;

  const itemsRef = useRef<T[]>([...initialItems]);
  const [updateCounter, setUpdateCounter] = useState(0);

  const forceUpdate = useCallback((): void => {
    setUpdateCounter(prev => prev + 1);
  }, []);

  const createCollection = useCallback((items: readonly T[]): Collection<T> => {
    return (items.length === 0 ? EMPTY_ARRAY : Object.freeze([...items])) as Collection<T>;
  }, []);

  const executeChange = useCallback((
    newItemsFactory: () => readonly T[]
  ): boolean => {
    const prevItems = createCollection(itemsRef.current);
    const newItems = createCollection(newItemsFactory());

    if (onBeforeChange) {
      const result = onBeforeChange(prevItems, newItems);
      if (result === false) return false;
    }

    if (prevItems === newItems ||
        (prevItems.length === newItems.length &&
         prevItems.every((item, index) => equalityFn(item, newItems[index])))) {
      return false;
    }

    itemsRef.current = [...newItems];
    forceUpdate();

    onAfterChange?.(prevItems, newItems);

    return true;
  }, [onBeforeChange, onAfterChange, equalityFn, forceUpdate, createCollection]);

  const items = useMemo((): Collection<T> => {
    return createCollection(itemsRef.current);
  }, [updateCounter, createCollection]);

  const isValidIndex = useCallback((index: number): index is number => {
    return Number.isInteger(index) && index >= 0 && index < itemsRef.current.length;
  }, []);

  const isValidInsertIndex = useCallback((index: number): index is number => {
    return Number.isInteger(index) && index >= 0 && index <= itemsRef.current.length;
  }, []);

  // Mutation operations
  const add = useCallback(((indexOrItem: number | T, item?: T): boolean => {
    if (typeof indexOrItem === 'number') {
      const index = indexOrItem;
      if (!isValidInsertIndex(index) || item === undefined) return false;

      return executeChange(() => [
        ...itemsRef.current.slice(0, index),
        item,
        ...itemsRef.current.slice(index)
      ]);
    } else {
      return executeChange(() => [...itemsRef.current, indexOrItem]);
    }
  }) as AddMethod<T>, [executeChange, isValidInsertIndex]);

  const addAllImpl = useCallback((
    indexOrItems: number | readonly T[],
    items?: readonly T[]
  ): boolean => {
    if (typeof indexOrItems === 'number') {
      const index = indexOrItems;
      if (!isValidInsertIndex(index) || !items || items.length === 0) return false;
      return executeChange(() => [
        ...itemsRef.current.slice(0, index),
        ...items,
        ...itemsRef.current.slice(index)
      ]);
    } else {
      if (indexOrItems.length === 0) return false;
      return executeChange(() => [...itemsRef.current, ...indexOrItems]);
    }
  }, [executeChange, isValidInsertIndex]);
  const addAll = addAllImpl as AddAllMethod<T>;

  const remove = useCallback((item: T): boolean => {
    const index = itemsRef.current.findIndex(existing => equalityFn(existing, item));
    return index !== -1 && executeChange(() => [
      ...itemsRef.current.slice(0, index),
      ...itemsRef.current.slice(index + 1)
    ]);
  }, [executeChange, equalityFn]);

  const removeAt = useCallback((index: number): T | undefined => {
    if (!isValidIndex(index)) return undefined;

    const removedItem = itemsRef.current[index];
    const success = executeChange(() => [
      ...itemsRef.current.slice(0, index),
      ...itemsRef.current.slice(index + 1)
    ]);

    return success ? removedItem : undefined;
  }, [executeChange, isValidIndex]);

  const removeAll = useCallback((itemsToRemove: readonly T[]): boolean => {
    const itemsSet = new Set(itemsToRemove);
    return executeChange(() =>
      itemsRef.current.filter(item => !itemsSet.has(item))
    );
  }, [executeChange]);

  const removeIf = useCallback((predicate: Predicate<T>): boolean => {
    return executeChange(() =>
      itemsRef.current.filter((item, index) => !predicate(item, index))
    );
  }, [executeChange]);

  const set = useCallback((index: number, item: T): T | undefined => {
    if (!isValidIndex(index)) return undefined;

    const oldItem = itemsRef.current[index];
    const success = executeChange(() => [
      ...itemsRef.current.slice(0, index),
      item,
      ...itemsRef.current.slice(index + 1)
    ]);

    return success ? oldItem : undefined;
  }, [executeChange, isValidIndex]);

  const clear = useCallback((): boolean => {
    return itemsRef.current.length > 0 && executeChange(() => []);
  }, [executeChange]);

  const retainAll = useCallback((itemsToRetain: readonly T[]): boolean => {
    const retainSet = new Set(itemsToRetain);
    return executeChange(() =>
      itemsRef.current.filter(item => retainSet.has(item))
    );
  }, [executeChange]);

  const sort = useCallback((compareFn?: Comparator<T>): boolean => {
    return executeChange(() => [...itemsRef.current].sort(compareFn));
  }, [executeChange]);

  const reverse = useCallback((): boolean => {
    return executeChange(() => [...itemsRef.current].reverse());
  }, [executeChange]);

  const shuffle = useCallback((): boolean => {
    return executeChange(() => {
      const newItems = [...itemsRef.current];
      for (let i = newItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
      }
      return newItems;
    });
  }, [executeChange]);

  // Query operations
  const get = useCallback((index: number): T | undefined => {
    return isValidIndex(index) ? itemsRef.current[index] : undefined;
  }, [isValidIndex]);

  const indexOf = useCallback((item: T): number => {
    return itemsRef.current.findIndex(existing => equalityFn(existing, item));
  }, [equalityFn]);

  const lastIndexOf = useCallback((item: T): number => {
    const items = itemsRef.current;
    for (let i = items.length - 1; i >= 0; i--) {
      if (equalityFn(items[i], item)) return i;
    }
    return -1;
  }, [equalityFn]);

  const contains = useCallback((item: T): boolean => {
    return itemsRef.current.some(existing => equalityFn(existing, item));
  }, [equalityFn]);

  const containsAll = useCallback((itemsToCheck: readonly T[]): boolean => {
    return itemsToCheck.every(item => contains(item));
  }, [contains]);

  const subList = useCallback((fromIndex: number, toIndex: number): T[] => {
    return itemsRef.current.slice(fromIndex, toIndex);
  }, []);

  // Functional operations
  const filter = useCallback(((predicate: Predicate<T> | TypeGuardPredicate<T, any>): T[] => {
    return itemsRef.current.filter(predicate as Predicate<T>);
  }) as UseCollectionReturn<T>['filter'], []);

  const map = useCallback(<U>(mapper: Mapper<T, U>): U[] => {
    return itemsRef.current.map(mapper);
  }, []);

  const flatMap = useCallback(<U>(mapper: Mapper<T, readonly U[]>): U[] => {
    return itemsRef.current.flatMap(mapper);
  }, []);

  const reduce = useCallback(<U>(
    reducer: Reducer<T, U>,
    initialValue: U
  ): U => {
    return itemsRef.current.reduce(reducer, initialValue);
  }, []);

  const forEach = useCallback((action: (item: T, index: number) => void): void => {
    itemsRef.current.forEach(action);
  }, []);

  const find = useCallback(((predicate: Predicate<T> | TypeGuardPredicate<T, any>): T | undefined => {
    return itemsRef.current.find(predicate as Predicate<T>);
  }) as UseCollectionReturn<T>['find'], []);

  const findIndex = useCallback((predicate: Predicate<T>): number => {
    return itemsRef.current.findIndex(predicate);
  }, []);

  const some = useCallback((predicate: Predicate<T>): boolean => {
    return itemsRef.current.some(predicate);
  }, []);

  const every = useCallback((predicate: Predicate<T>): boolean => {
    return itemsRef.current.every(predicate);
  }, []);

  // Advanced operations
  const partition = useCallback(((predicate: Predicate<T> | TypeGuardPredicate<T, any>) => {
    const truthy: T[] = [];
    const falsy: T[] = [];

    itemsRef.current.forEach((item, index) => {
      if (predicate(item, index)) {
        truthy.push(item);
      } else {
        falsy.push(item);
      }
    });

    return [truthy, falsy] as const;
  }) as UseCollectionReturn<T>['partition'], []);

  const groupBy = useCallback(<K extends PropertyKey>(
    keySelector: (item: T) => K
  ): Record<K, T[]> => {
    const groups = {} as Record<K, T[]>;

    itemsRef.current.forEach(item => {
      const key = keySelector(item);
      (groups[key] ??= []).push(item);
    });

    return groups;
  }, []);

  const distinct = useCallback((keySelector?: (item: T) => unknown): T[] => {
    if (!keySelector) {
      return [...new Set(itemsRef.current)];
    }

    const seen = new Set();
    return itemsRef.current.filter(item => {
      const key = keySelector(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const distinctBy = useCallback(<K>(keySelector: (item: T) => K): T[] => {
    const seen = new Set<K>();
    return itemsRef.current.filter(item => {
      const key = keySelector(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, []);

  const chunk = useCallback((size: number): T[][] => {
    if (size <= 0) return [];

    const chunks: T[][] = [];
    for (let i = 0; i < itemsRef.current.length; i += size) {
      chunks.push(itemsRef.current.slice(i, i + size));
    }
    return chunks;
  }, []);

  const takeWhile = useCallback((predicate: Predicate<T>): T[] => {
    const result: T[] = [];
    for (let i = 0; i < itemsRef.current.length; i++) {
      if (!predicate(itemsRef.current[i], i)) break;
      result.push(itemsRef.current[i]);
    }
    return result;
  }, []);

  const dropWhile = useCallback((predicate: Predicate<T>): T[] => {
    let dropCount = 0;
    for (let i = 0; i < itemsRef.current.length; i++) {
      if (!predicate(itemsRef.current[i], i)) break;
      dropCount++;
    }
    return itemsRef.current.slice(dropCount);
  }, []);

  const zip = useCallback(<U>(other: readonly U[]): Array<readonly [T, U]> => {
    const length = Math.min(itemsRef.current.length, other.length);
    const result: Array<readonly [T, U]> = [];

    for (let i = 0; i < length; i++) {
      result.push([itemsRef.current[i], other[i]] as const);
    }

    return result;
  }, []);

  const toArray = useCallback((): T[] => [...itemsRef.current], []);
  const toSet = useCallback((): Set<T> => new Set(itemsRef.current), []);
  const toMap = useCallback(<K>(keySelector: (item: T) => K): Map<K, T> => {
    return new Map(itemsRef.current.map(item => [keySelector(item), item]));
  }, []);

  return useMemo((): UseCollectionReturn<T> => ({
    items,
    size: items.length,
    isEmpty: items.length === 0,
    add,
    addAll,
    remove,
    removeAt,
    removeAll,
    removeIf,
    set,
    clear,
    filter,
    map,
    flatMap,
    reduce,
    get,
    indexOf,
    lastIndexOf,
    contains,
    containsAll,
    retainAll,
    subList,
    sort,
    reverse,
    shuffle,
    forEach,
    find,
    findIndex,
    some,
    every,
    partition,
    groupBy,
    distinct,
    distinctBy,
    chunk,
    takeWhile,
    dropWhile,
    zip,
    toArray,
    toSet,
    toMap,
  }), [
    items, add, addAll, remove, removeAt, removeAll, removeIf, set, clear,
    filter, map, flatMap, reduce, get, indexOf, lastIndexOf, contains, containsAll,
    retainAll, subList, sort, reverse, shuffle, forEach, find, findIndex, some,
    every, partition, groupBy, distinct, distinctBy, chunk, takeWhile, dropWhile,
    zip, toArray, toSet, toMap,
  ]);
}

// =============================================================================
// PREACT-SPECIFIC INTEGRATION HELPERS
// =============================================================================

/**
 * Internal type for collection context value.
 * @template T - The type of items in the collection
 * @internal
 */
interface CollectionContextValue<T> {
  readonly items: Collection<T>;
  readonly collection: UseCollectionReturn<T>;
}

/**
 * Props for the CollectionProvider component.
 * @template T - The type of items in the collection
 */
export interface CollectionProviderProps<T> {
  /** Child components that will have access to the collection context */
  children: ComponentChildren;
  /** Initial items to populate the collection */
  initialItems?: readonly T[];
  /** Configuration options for the collection behavior */
  options?: UseCollectionOptions<T>;
}

/**
 * Create a collection context for sharing collection state across components.
 * 
 * This factory function creates a Provider component and a hook for accessing
 * the collection context. Useful for sharing collection state across multiple
 * components without prop drilling.
 * 
 * @template T - The type of items in the collection
 * @returns Object containing CollectionProvider component and useCollectionContext hook
 * 
 * @example
 * ```tsx
 * // Create the context
 * const { CollectionProvider, useCollectionContext } = createCollectionContext<Todo>();
 * 
 * // Use in app root
 * function App() {
 *   return (
 *     <CollectionProvider initialItems={initialTodos}>
 *       <TodoList />
 *       <TodoStats />
 *     </CollectionProvider>
 *   );
 * }
 * 
 * // Access in child components
 * function TodoList() {
 *   const todos = useCollectionContext();
 *   return (
 *     <div>
 *       {todos.items.map(todo => (
 *         <TodoItem key={todo.id} todo={todo} />
 *       ))}
 *     </div>
 *   );
 * }
 * 
 * function TodoStats() {
 *   const todos = useCollectionContext();
 *   return <div>Total: {todos.size}</div>;
 * }
 * ```
 */
export function createCollectionContext<T>() {
  const CollectionContextObj = createContext<CollectionContextValue<T> | null>(null);

  /**
   * Provider component that makes collection state available to child components.
   * @param props - Provider props including children and collection options
   */
  const CollectionProvider = ({ children, initialItems, options }: CollectionProviderProps<T>) => {
    const collection = useCollection(initialItems, options);

    const value = useMemo((): CollectionContextValue<T> => ({
      items: collection.items,
      collection
    }), [collection]);

    return h(
      CollectionContextObj.Provider,
      { value },
      children
    );
  };

  /**
   * Hook to access the collection from the context.
   * Must be used within a CollectionProvider.
   * @returns The collection interface with all operations
   * @throws Error if used outside of CollectionProvider
   */
  const useCollectionContext = (): UseCollectionReturn<T> => {
    const context = useContext(CollectionContextObj);
    if (!context) {
      throw new Error('useCollectionContext must be used within CollectionProvider');
    }
    return context.collection;
  };

  return { CollectionProvider, useCollectionContext };
}

/**
 * Integration helper for Preact Signals.
 * 
 * Synchronizes a collection with a Preact signal, automatically updating
 * the signal whenever the collection changes. Useful for integrating with
 * existing signal-based state management.
 * 
 * @template T - The type of items in the collection
 * @param signal - Signal object containing the collection data
 * @param setSignal - Function to update the signal value
 * @param options - Additional collection options
 * @returns Collection interface synchronized with the signal
 * 
 * @example
 * ```tsx
 * import { signal } from '@preact/signals';
 * 
 * const todosSignal = signal<Todo[]>([]);
 * 
 * function TodoManager() {
 *   const todos = useCollectionWithSignal(
 *     todosSignal,
 *     (newTodos) => { todosSignal.value = newTodos; }
 *   );
 * 
 *   // Collection changes automatically update the signal
 *   const addTodo = () => todos.add({ id: Date.now(), text: 'New todo' });
 * 
 *   return (
 *     <div>
 *       <button onClick={addTodo}>Add Todo</button>
 *       <p>Signal value: {todosSignal.value.length} items</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCollectionWithSignal<T>(
  signal: { value: readonly T[] },
  setSignal: (value: readonly T[]) => void,
  options: UseCollectionOptions<T> = {}
): UseCollectionReturn<T> {
  return useCollection(signal.value, {
    ...options,
    onAfterChange: (prev, next) => {
      setSignal(next);
      options.onAfterChange?.(prev, next);
    }
  });
}

/**
 * Collection hook with external API synchronization.
 * 
 * Provides automatic synchronization with external APIs, databases, or services.
 * Supports debounced sync-on-change and manual sync operations. Useful for
 * collections that need to persist changes to a backend service.
 * 
 * @template T - The type of items in the collection
 * @param initialItems - Initial items to populate the collection
 * @param syncConfig - Configuration for synchronization behavior
 * @param options - Additional collection options
 * @returns Collection interface with sync capability
 * 
 * @example
 * ```tsx
 * function TodoApp() {
 *   const todos = useCollectionWithSync<Todo>([], {
 *     onSync: async (items) => {
 *       // Sync to backend API
 *       await fetch('/api/todos', {
 *         method: 'POST',
 *         body: JSON.stringify(items)
 *       });
 *     },
 *     syncOnChange: true,    // Auto-sync when collection changes
 *     debounceMs: 1000      // Debounce sync calls by 1 second
 *   });
 * 
 *   // Manual sync
 *   const handleManualSync = async () => {
 *     await todos.sync();
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={() => todos.add(newTodo)}>Add Todo</button>
 *       <button onClick={handleManualSync}>Manual Sync</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Sync with localStorage
 * const todos = useCollectionWithSync<Todo>(
 *   JSON.parse(localStorage.getItem('todos') || '[]'),
 *   {
 *     onSync: (items) => {
 *       localStorage.setItem('todos', JSON.stringify(items));
 *     },
 *     syncOnChange: true,
 *     debounceMs: 500
 *   }
 * );
 * ```
 */
export function useCollectionWithSync<T>(
  initialItems: readonly T[] = EMPTY_ARRAY,
  syncConfig: {
    /** Function to synchronize collection data with external service */
    readonly onSync?: (items: readonly T[]) => Promise<void> | void;
    /** Whether to automatically sync when the collection changes */
    readonly syncOnChange?: boolean;
    /** Debounce delay in milliseconds for auto-sync operations */
    readonly debounceMs?: number;
  } = {},
  options: UseCollectionOptions<T> = {}
): UseCollectionReturn<T> & { 
  /** Manually trigger synchronization with external service */
  readonly sync: () => Promise<void>;
} {
  const { onSync, syncOnChange = false, debounceMs = 500 } = syncConfig;
  const syncTimeoutRef = useRef<number>();

  const collection = useCollection(initialItems, {
    ...options,
    onAfterChange: (prev, next) => {
      if (syncOnChange && onSync) {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }

        syncTimeoutRef.current = setTimeout(() => {
          void onSync(next);
        }, debounceMs) as unknown as number;
      }

      options.onAfterChange?.(prev, next);
    }
  });

  const sync = useCallback(async (): Promise<void> => {
    if (onSync) {
      await onSync(collection.items);
    }
  }, [onSync, collection.items]);

  return useMemo(() => ({
    ...collection,
    sync
  }), [collection, sync]);
}

// =============================================================================
// USAGE EXAMPLES FOR PREACT
// =============================================================================

/*
interface Todo {
  readonly id: number;
  readonly text: string;
  readonly completed: boolean;
  readonly priority: 'low' | 'medium' | 'high';
}

// Example 1: Basic usage
export function PreactTodoList() {
  const todos = useCollection<Todo>([
    { id: 1, text: 'Learn Preact', completed: false, priority: 'high' },
    { id: 2, text: 'Build awesome apps', completed: false, priority: 'medium' },
  ]);

  const addTodo = useCallback((text: string) => {
    todos.add({
      id: Date.now(),
      text,
      completed: false,
      priority: 'medium'
    });
  }, [todos]);

  const toggleTodo = useCallback((id: number) => {
    const index = todos.findIndex(todo => todo.id === id);
    if (index !== -1) {
      const todo = todos.get(index)!;
      todos.set(index, { ...todo, completed: !todo.completed });
    }
  }, [todos]);

  const completedTodos = todos.filter(todo => todo.completed);
  const todosByPriority = todos.groupBy(todo => todo.priority);

  return (
    <div>
      <h2>Todos ({todos.size})</h2>
      {Object.entries(todosByPriority).map(([priority, items]) => (
        <div key={priority}>
          <h3>{priority} Priority ({items.length})</h3>
          {items.map(todo => (
            <div key={todo.id}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <span style={{
                  textDecoration: todo.completed ? 'line-through' : 'none'
                }}>
                  {todo.text}
                </span>
              </label>
            </div>
          ))}
        </div>
      ))}
      <button onClick={() => addTodo('New todo')}>Add Todo</button>
      <button onClick={() => todos.clear()}>Clear All</button>
      <p>Completed: {completedTodos.length}</p>
    </div>
  );
}

// Example 2: Context usage
const { CollectionProvider, useCollectionContext } = createCollectionContext<Todo>();

export function TodoApp() {
  const initialTodos: Todo[] = [
    { id: 1, text: 'Setup Preact', completed: true, priority: 'high' }
  ];

  return (
    <CollectionProvider initialItems={initialTodos}>
      <TodoList />
      <TodoStats />
    </CollectionProvider>
  );
}

function TodoList() {
  const todos = useCollectionContext();
  return (
    <div>
      <h3>Todo List</h3>
      {todos.items.map(todo => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </div>
  );
}

function TodoStats() {
  const todos = useCollectionContext();
  const [completed, pending] = todos.partition(todo => todo.completed);
  return (
    <div>
      <p>Total: {todos.size}</p>
      <p>Completed: {completed.length}</p>
      <p>Pending: {pending.length}</p>
    </div>
  );
}
*/
