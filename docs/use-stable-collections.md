# Signals-First Stable Collections API

A modern, type-safe TypeScript utility for reactive collection management in Preact applications using the Signals API.

## Overview

This utility provides a comprehensive set of tools for working with collections (arrays, Sets, Maps) in a reactive and performant manner. Built on top of `@preact/signals`, it offers:

- **🎯 Signals-First Design**: Everything returns reactive signals for seamless integration
- **⚡ Performance Optimized**: LRU caching, empty singletons, and efficient operations
- **🔒 Type-Safe**: Full TypeScript support with strict type checking
- **🪝 Preact Hooks**: Built with Preact hooks patterns for component integration
- **🧪 Thoroughly Tested**: 37 comprehensive tests with 86%+ coverage

## Installation

The utility is included in the project at `src/utils/use-stable-collections.ts`.

## Key Features

### Empty Singleton Pattern

Empty collections automatically use shared singleton references to prevent unnecessary re-renders:

```typescript
const emptyArray1 = useCollection([]);
const emptyArray2 = useCollection([]);
// emptyArray1.value === emptyArray2.value (same reference)
```

### LRU Cache

Expensive operations are cached automatically with configurable size:

```typescript
const transform = useTransform(items, { cacheSize: 100 });
```

### Modern TypeScript

Uses TypeScript 5.4.5 features:
- `const` assertions for immutability
- Readonly types throughout
- Strict null checking
- Type guards and narrowing

## API Reference

### Core Hooks

#### `useCollection<T>(items, options?)`

Convert any collection to a reactive signal with automatic empty singleton optimization.

**Parameters:**
- `items`: Array, Set, or Map to convert
- `options?`: Configuration object
  - `debug?: boolean` - Enable debug logging
  - `cacheSize?: number` - LRU cache size (default: 100)

**Returns:** `ReadonlySignal<T>` containing the stable collection

**Example:**
```typescript
const items = useCollection([1, 2, 3]);
const emptyItems = useCollection([]); // Returns singleton
const itemSet = useCollection(new Set([1, 2]));
const itemMap = useCollection(new Map([['a', 1]]));
```

#### `useTransform<T>(source, options?)`

Fluent API for chaining array transformations with automatic caching.

**Parameters:**
- `source`: Array or signal to transform
- `options?`: Configuration object

**Returns:** Transform API object with methods:
- `filter(predicate)` - Filter items
- `map(mapper)` - Transform items
- `sort(compareFn?)` - Sort items
- `unique()` - Remove duplicates
- `slice(start?, end?)` - Get subarray
- `take(n)` - Take first n items
- `drop(n)` - Drop first n items
- `find(predicate)` - Find first match
- `some(predicate)` - Check if any match
- `every(predicate)` - Check if all match
- `reduce(reducer, initial)` - Reduce to value
- `groupBy(keyFn)` - Group by key
- `toSet()` - Convert to Set
- `pipe(transform)` - Custom transform
- `length()` - Get length
- `isEmpty()` - Check if empty
- `clearCache()` - Clear operation cache

**Example:**
```typescript
const processed = useTransform(items)
  .filter(x => x.active)
  .map(x => ({ ...x, timestamp: Date.now() }))
  .sort((a, b) => a.priority - b.priority)
  .take(10);

console.log(processed.value); // Reactive result
```

#### `useComputed<T, Deps>(compute, deps, options?)`

Create computed collection from multiple dependencies.

**Parameters:**
- `compute`: Function taking dependencies and returning array
- `deps`: Readonly array of dependencies
- `options?`: Configuration object

**Returns:** `ReadonlySignal<T[]>` with computed result

**Example:**
```typescript
const multiplier = 2;
const items = [1, 2, 3];
const doubled = useComputed(
  (mult, arr) => arr.map(x => x * mult),
  [multiplier, items]
);
```

#### `useCombine<T>(...sources)`

Combine multiple arrays into a single array.

**Parameters:**
- `sources`: Variable number of arrays or signals

**Returns:** `ReadonlySignal<T[]>` with combined array

**Example:**
```typescript
const items1 = [1, 2];
const items2 = signal([3, 4]);
const combined = useCombine(items1, items2); // [1, 2, 3, 4]
```

#### `useConditional<T>(condition, truthyValue, falsyValue?)`

Select collection based on condition.

**Parameters:**
- `condition`: Boolean or signal
- `truthyValue`: Collection when true
- `falsyValue?`: Collection when false (default: empty)

**Returns:** `ReadonlySignal<T[]>` with selected collection

**Example:**
```typescript
const showActive = signal(true);
const result = useConditional(showActive, activeItems, inactiveItems);
```

#### `usePagination<T>(collection, pageSize)`

Paginate a collection with navigation controls.

**Parameters:**
- `collection`: Array or signal to paginate
- `pageSize`: Number of items per page

**Returns:** Object with:
- `paginationData`: Signal with current page data
- `currentPage`: Signal with current page number
- `goToPage(page)`: Navigate to specific page
- `nextPage()`: Go to next page
- `previousPage()`: Go to previous page

**Example:**
```typescript
const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const pagination = usePagination(items, 3);

console.log(pagination.paginationData.value.items); // [1, 2, 3]
pagination.nextPage();
console.log(pagination.paginationData.value.items); // [4, 5, 6]
```

### Standalone Functions

For convenience, key transform operations are available as standalone functions:

```typescript
import { filter, map, sort, unique, groupBy, reduce } from './use-stable-collections';

const filtered = filter(items, x => x > 2);
const mapped = map(items, x => x * 2);
const sorted = sort(items, (a, b) => a - b);
const uniqueItems = unique(items);
const grouped = groupBy(items, x => x.category);
const sum = reduce(items, (acc, x) => acc + x, 0);
```

## Usage Patterns

### Basic Collection Stability

```typescript
const SearchResults: FunctionComponent<{ results: Podcast[] }> = ({ results }) => {
  // Stable reference prevents unnecessary re-renders when empty
  const stableResults = useCollection(results);
  
  return (
    <div>
      {stableResults.value.map(podcast => (
        <PodcastCard key={podcast.id} podcast={podcast} />
      ))}
    </div>
  );
};
```

### Reactive Data Processing

```typescript
const PodcastManager: FunctionComponent = () => {
  const [rawPodcasts, setRawPodcasts] = useState<Podcast[]>([]);
  const [filterText, setFilterText] = useState('');
  
  // Create reactive signal
  const podcastsSignal = useCollection(rawPodcasts);
  
  // Transform with multiple operations
  const processed = useTransform(podcastsSignal)
    .filter(p => p.title.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title))
    .take(10);
  
  return (
    <div>
      <SearchInput value={filterText} onChange={setFilterText} />
      <div>Showing {processed.value.length} podcasts</div>
      <PodcastList podcasts={processed.value} />
    </div>
  );
};
```

### Complex State Coordination

```typescript
const PlaylistManager: FunctionComponent = () => {
  const [active, setActive] = useState<Podcast[]>([]);
  const [queued, setQueued] = useState<Podcast[]>([]);
  const [archived, setArchived] = useState<Podcast[]>([]);
  
  // Combine all collections
  const allPodcasts = useCombine(
    useCollection(active),
    useCollection(queued),
    useCollection(archived)
  );
  
  // Derive statistics
  const stats = useComputed(
    (all, active, queued) => ({
      total: all.length,
      active: active.length,
      queued: queued.length,
      archived: all.length - active.length - queued.length
    }),
    [allPodcasts.value, active, queued]
  );
  
  return (
    <div>
      <StatsDisplay stats={stats.value} />
      <PodcastSections 
        active={active}
        queued={queued}
        archived={archived}
      />
    </div>
  );
};
```

### Pagination Example

```typescript
const PodcastList: FunctionComponent<{ podcasts: Podcast[] }> = ({ podcasts }) => {
  const pagination = usePagination(useCollection(podcasts), 20);
  
  return (
    <div>
      <div className="items">
        {pagination.paginationData.value.items.map(podcast => (
          <PodcastCard key={podcast.id} podcast={podcast} />
        ))}
      </div>
      
      <div className="pagination">
        <button 
          onClick={pagination.previousPage}
          disabled={!pagination.paginationData.value.hasPreviousPage}
        >
          Previous
        </button>
        
        <span>
          Page {pagination.paginationData.value.currentPage + 1} 
          of {pagination.paginationData.value.totalPages}
        </span>
        
        <button 
          onClick={pagination.nextPage}
          disabled={!pagination.paginationData.value.hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

## Performance Considerations

### Automatic Caching

Transform operations are cached automatically using an LRU cache. This means:
- Repeated operations on the same data return cached results
- Cache size is configurable (default: 100 entries)
- Cache can be cleared manually if needed

```typescript
const transform = useTransform(items, { cacheSize: 200 });
// Operations are cached...
transform.clearCache(); // Clear when needed
```

### Empty Singleton Optimization

Empty collections use shared singleton references:
- Reduces memory usage
- Prevents unnecessary re-renders
- Works for arrays, Sets, and Maps

```typescript
const empty1 = useCollection([]);
const empty2 = useCollection([]);
// empty1.value === empty2.value (same reference)
```

### Immutability

All collections are treated as readonly:
- TypeScript enforces immutability
- Maps and Sets in groups are frozen
- Prevents accidental mutations

## Type Safety

The utility is fully typed with TypeScript 5.4.5:

```typescript
// Type inference works seamlessly
const numbers = useCollection([1, 2, 3]); // ReadonlySignal<number[]>
const strings = map(numbers, n => n.toString()); // ReadonlySignal<string[]>

// Type errors are caught
const doubled = useTransform(numbers).map(n => n * 2); // ✓
const invalid = useTransform(numbers).map(n => n.toUpperCase()); // ✗ Type error
```

## Testing

The utility includes comprehensive tests covering:
- All core hooks and transforms
- Empty collection handling
- Signal reactivity
- Type safety
- Edge cases

Run tests with:
```bash
npm test -- use-stable-collections
```

## Migration Guide

### From useImmutableCollection

```typescript
// Before
const stableItems = useImmutableCollection(items);

// After (enhanced with signals)
const stableItems = useCollection(items);
// Access via .value: stableItems.value
```

### From Manual Memoization

```typescript
// Before
const filtered = useMemo(() => items.filter(x => x.active), [items]);
const sorted = useMemo(() => [...filtered].sort((a, b) => a.name.localeCompare(b.name)), [filtered]);

// After
const processed = useTransform(items)
  .filter(x => x.active)
  .sort((a, b) => a.name.localeCompare(b.name));
```

## Best Practices

1. **Use signals for reactive data**: Leverage the signals API for automatic reactivity
2. **Chain transforms**: Use the fluent API for readable data processing
3. **Configure cache size**: Adjust based on your performance needs
4. **Enable debug mode**: Use `{ debug: true }` during development
5. **Type your data**: Let TypeScript infer types for better DX

## License

MIT

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.
