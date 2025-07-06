# Enhanced Stable Collections Utility

A comprehensive TypeScript utility for stable collection references with full Preact Signals integration, designed for the Podr podcast player project.

## 🎯 Overview

This enhanced version of the stable collections utility provides:

- **Stable Empty References**: Consistent references for empty collections to prevent unnecessary re-renders
- **Preact Signals Integration**: First-class support for reactive programming
- **Type Safety**: Full TypeScript support with proper generic types
- **Performance Optimized**: Minimal overhead with smart memoization
- **Ecosystem Compatible**: Works seamlessly with existing Preact/React patterns

## 🚀 Key Features

### 1. **Core Stability**
- Empty arrays, Sets, and Maps get singleton references
- Equivalent collections maintain stable references
- Custom equality comparison support

### 2. **Reactive Signals**
- Signal-based versions of all utilities
- Computed collection transformations
- Signal state management

### 3. **Transform API**
- Chainable array operations
- Automatic stability for transform results
- Memory-efficient processing

## 📖 API Reference

### `useStable(collection, options?)`

Ensures collections have stable references when empty or equivalent.

```tsx
// Basic usage
const stableItems = useStable(searchResults); // [] -> same reference always
const stableSet = useStable(new Set(selected));
const stableMap = useStable(new Map(pairs));

// With custom equality
const stableWithCustom = useStable(items, {
  isEqual: deepEqual,
  debug: true
});
```

**Parameters:**
- `collection`: Array, Set, or Map to stabilize
- `options`: Configuration object
  - `isEqual`: Custom equality function
  - `debug`: Enable debug warnings

**Returns:** Stable reference to the collection

### `useStableSignal(collection, options?)`

Creates reactive signals containing stable collection references.

```tsx
const itemsSignal = useStableSignal(searchResults);

// Use in computed values
const itemCount = computed(() => itemsSignal.value.length);

// Access reactive value
console.log(itemsSignal.value); // Always stable reference
```

**Returns:** `ReadonlySignal<T>` with stable collection value

### `useComputedCollection(source, transform, options?)`

Creates computed signals that derive from stable collections.

```tsx
const items = useStableSignal([1, 2, 3, 4, 5]);

const evenNumbers = useComputedCollection(
  items,
  (arr) => arr.filter(n => n % 2 === 0)
);

const doubled = useComputedCollection(
  items,
  (arr) => arr.map(n => n * 2)
);
```

**Parameters:**
- `source`: Source signal to transform
- `transform`: Transformation function
- `options`: Stability options

### `useCombinedCollections(sources, combiner, options?)`

Combines multiple signals into a single reactive signal.

```tsx
const items1 = useStableSignal([1, 2]);
const items2 = useStableSignal([3, 4]);

const combined = useCombinedCollections(
  [items1, items2],
  ([arr1, arr2]) => [...arr1, ...arr2]
);
// Result: signal with value [1, 2, 3, 4]
```

### `useStableCollectionState(initialValue, options?)`

Hook for managing collection state with signals and stability.

```tsx
const [items, setItems] = useStableCollectionState([1, 2, 3]);

// Reactive access
const itemCount = computed(() => items.value.length);

// Imperative updates
const addItem = useCallback((item) => {
  setItems(prev => [...prev, item]);
}, [setItems]);

const clearItems = useCallback(() => {
  setItems([]);
}, [setItems]);
```

**Returns:** `[ReadonlySignal<T>, (updater) => void]`

### `useTransform(source, options?)`

Provides a fluent API for chaining array operations with automatic stability.

```tsx
const processedItems = useTransform(items)
  .filter(item => item.active)
  .map(item => ({ ...item, timestamp: Date.now() }))
  .sort((a, b) => a.priority - b.priority)
  .take(10);
```

**Available Methods:**
- `filter(predicate)`: Filter elements
- `map(mapper)`: Transform elements
- `slice(start?, end?)`: Get array slice
- `take(n)`: Take first n elements
- `unique()`: Get unique elements
- `sort(compareFn?)`: Sort elements

### `shallowEqual(a, b)`

Default equality function for collections that performs shallow comparison.

```tsx
// Arrays
shallowEqual([1, 2, 3], [1, 2, 3]); // true
shallowEqual([1, 2, 3], [1, 2, 4]); // false

// Sets
shallowEqual(new Set([1, 2]), new Set([1, 2])); // true

// Maps
shallowEqual(
  new Map([['a', 1]]), 
  new Map([['a', 1]])
); // true
```

## 🎨 Usage Patterns

### 1. **Basic Stability for Components**

```tsx
const SearchResults: FunctionComponent<{ results: Podcast[] }> = ({ results }) => {
  // Stable reference prevents unnecessary re-renders when empty
  const stableResults = useStable(results);
  
  return (
    <div>
      {stableResults.map(podcast => (
        <PodcastCard key={podcast.id} podcast={podcast} />
      ))}
    </div>
  );
};
```

### 2. **Reactive Data Processing**

```tsx
const PodcastManager: FunctionComponent = () => {
  const [rawPodcasts, setRawPodcasts] = useStableCollectionState([]);
  const [filterText, setFilterText] = useState('');
  
  // Create reactive filtered and sorted results
  const filteredPodcasts = useComputedCollection(
    rawPodcasts,
    (podcasts) => useTransform(podcasts)
      .filter(p => p.title.toLowerCase().includes(filterText.toLowerCase()))
      .sort((a, b) => a.title.localeCompare(b.title))
  );
  
  const podcastCount = computed(() => filteredPodcasts.value.length);
  
  return (
    <div>
      <SearchInput value={filterText} onChange={setFilterText} />
      <div>Found {podcastCount.value} podcasts</div>
      <PodcastList podcasts={filteredPodcasts.value} />
    </div>
  );
};
```

### 3. **Complex State Coordination**

```tsx
const PlaylistManager: FunctionComponent = () => {
  const [activePodcasts, setActivePodcasts] = useStableCollectionState([]);
  const [queuedPodcasts, setQueuedPodcasts] = useStableCollectionState([]);
  const [archivedPodcasts, setArchivedPodcasts] = useStableCollectionState([]);
  
  // Combine all podcasts reactively
  const allPodcasts = useCombinedCollections(
    [activePodcasts, queuedPodcasts, archivedPodcasts],
    ([active, queued, archived]) => [...active, ...queued, ...archived]
  );
  
  // Derived statistics
  const stats = computed(() => ({
    total: allPodcasts.value.length,
    active: activePodcasts.value.length,
    queued: queuedPodcasts.value.length,
    archived: archivedPodcasts.value.length
  }));
  
  return (
    <div>
      <StatsDisplay stats={stats.value} />
      <PodcastSections 
        active={activePodcasts.value}
        queued={queuedPodcasts.value}
        archived={archivedPodcasts.value}
      />
    </div>
  );
};
```

### 4. **Performance-Critical Lists**

```tsx
const VirtualizedPodcastList: FunctionComponent<{ podcasts: Podcast[] }> = ({ podcasts }) => {
  // Transform and stabilize for virtualization
  const processedPodcasts = useTransform(podcasts)
    .filter(p => p.isVisible)
    .map(p => ({
      ...p,
      height: calculateItemHeight(p),
      key: `podcast-${p.id}`
    }));
    
  // Memoized virtualization setup
  const virtualizer = useMemo(() => 
    new FixedSizeList({
      height: 400,
      itemCount: processedPodcasts.length,
      itemSize: 80,
      itemData: processedPodcasts
    }), [processedPodcasts]
  );
  
  return <VirtualList virtualizer={virtualizer} />;
};
```

## 🔧 Integration with Existing Code

The enhanced utility is designed to be **backward compatible** while providing new capabilities:

```tsx
// Existing code continues to work
const stableItems = useStable(items);

// Enhanced with signals
const reactiveItems = useStableSignal(items);

// Mix and match approaches
const SearchComponent: FunctionComponent = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  // Traditional stability
  const stableResults = useStable(results);
  
  // Signal-based processing
  const resultsSignal = useStableSignal(stableResults);
  const processedResults = useComputedCollection(
    resultsSignal,
    (items) => useTransform(items).filter(item => item.score > 0.5)
  );
  
  return (
    <div>
      <SearchInput value={query} onChange={setQuery} />
      <ResultsList items={processedResults.value} />
    </div>
  );
};
```

## 📊 Performance Benefits

1. **Reduced Re-renders**: Stable references prevent unnecessary component updates
2. **Memory Efficiency**: Singleton empty collections reduce memory usage
3. **Smart Memoization**: Only recompute when actual values change
4. **Reactive Optimizations**: Signals enable fine-grained reactivity

## 🧪 Testing Strategy

The utility includes comprehensive tests covering:

- ✅ Stable reference behavior for all collection types
- ✅ Signal reactivity and computed values
- ✅ Transform API chainability and correctness
- ✅ Custom equality function support
- ✅ Integration scenarios
- ✅ Performance characteristics
- ✅ Edge cases and error conditions

## 🎯 Best Practices

1. **Use `useStable` for basic stability** when you don't need reactivity
2. **Prefer `useStableSignal`** when building reactive UIs
3. **Chain transforms** for complex data processing
4. **Combine signals** for coordinating multiple data sources
5. **Leverage custom equality** for deep object comparisons when needed
6. **Use debug mode** during development to identify optimization opportunities

## 🚀 Migration Guide

From basic `useStable`:
```tsx
// Before
const stableItems = useStable(items);

// After (enhanced)
const stableItems = useStable(items, { debug: true });
const reactiveItems = useStableSignal(items);
```

From manual transformations:
```tsx
// Before
const filtered = useMemo(() => items.filter(x => x.active), [items]);
const sorted = useMemo(() => [...filtered].sort((a, b) => a.name.localeCompare(b.name)), [filtered]);

// After
const processed = useTransform(items)
  .filter(x => x.active)
  .sort((a, b) => a.name.localeCompare(b.name));
```

This enhanced stable collections utility provides a robust foundation for building reactive, performant applications while maintaining the simplicity and reliability of the original implementation.
