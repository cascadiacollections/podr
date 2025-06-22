# New classList API Usage Examples

This document demonstrates how the new classList APIs have been integrated across the Podr codebase.

## 🎯 Integration Summary

The new classList APIs have been strategically integrated throughout the application components to demonstrate different usage patterns and capabilities:

### 1. AppFunctional.tsx - Declarative Hooks & Programmatic Manipulation

**Declarative State Management with `useConditionalClassList`:**
```typescript
// Dynamically manage main container classes based on app state
useConditionalClassList(mainContainerRef, {
  'app-container': true,
  'has-search-results': searchResults.value.length > 0,
  'has-favorites': feeds.value.length > 0,
  'has-episodes': results.value.length > 0
});

// Dynamic styling for search results section
useConditionalClassList(searchResultsRef, {
  'search-results-section': true,
  'results-loading': false,
  'has-multiple-results': searchResults.value.length > 1
});
```

**Programmatic classList Manipulation:**
```typescript
// Interactive hover effects using setClassList/unsetClassList
const handleImageHover = useCallback((event: MouseEvent, isEntering: boolean) => {
  const target = event.target as HTMLImageElement;
  if (isEntering) {
    setClassList(target, 'hover-effect', 'scale-animation');
  } else {
    unsetClassList(target, 'hover-effect', 'scale-animation');
  }
}, []);

// Temporary click effects with timed cleanup
const handleImageClick = useCallback((event: MouseEvent) => {
  const target = event.target as HTMLImageElement;
  setClassList(target, 'click-effect');
  setTimeout(() => {
    unsetClassList(target, 'click-effect');
  }, 200);
}, []);
```

### 2. List.tsx - Dynamic Container State Management

**Replacing useClassNames with Declarative Hook:**
```typescript
// Before: Manual className computation
const containerClassName = useClassNames(
  LIST_CONFIG.CSS_CLASSES.CONTAINER,
  {
    [LIST_CONFIG.CSS_CLASSES.LOADING]: isLoading,
    [LIST_CONFIG.CSS_CLASSES.EMPTY]: results.length === 0
  }
);

// After: Declarative hook with ref-based management
const containerRef = useRef<HTMLElement>(null);

useConditionalClassList(containerRef, {
  [LIST_CONFIG.CSS_CLASSES.CONTAINER]: true,
  [LIST_CONFIG.CSS_CLASSES.LOADING]: isLoading,
  [LIST_CONFIG.CSS_CLASSES.EMPTY]: results.length === 0
});
```

## 🚀 Benefits Demonstrated

### 1. **Declarative Class Management**
- Components declare their intended state through the `useConditionalClassList` hook
- Classes are automatically added/removed based on changing conditions
- Cleanup is handled automatically on component unmount

### 2. **Programmatic DOM Manipulation**
- Direct manipulation of element classes without React/Preact re-renders
- Ideal for animations, transitions, and user interaction feedback
- Consistent API across single elements and collections

### 3. **Performance Optimizations**
- Hooks manage class changes efficiently without triggering component re-renders
- Programmatic APIs batch operations and deduplicate classes
- Memory-efficient cleanup and lifecycle management

### 4. **Type Safety & Consistency**
- All APIs use the same `ClassNameInput` patterns as the existing `useClassNames` hook
- Full TypeScript support with proper type inference
- Consistent error handling and edge case management

## 🎨 Real-World Use Cases Implemented

### Interactive Feedback
```typescript
// Hover effects on podcast thumbnails
onMouseEnter={(e) => setClassList(e.target, 'hover-effect', 'scale-animation')}
onMouseLeave={(e) => unsetClassList(e.target, 'hover-effect', 'scale-animation')}
```

### State-Driven Styling
```typescript
// App container reflects current content state
useConditionalClassList(mainContainerRef, {
  'has-search-results': searchResults.value.length > 0,
  'has-favorites': feeds.value.length > 0,
  'has-episodes': results.value.length > 0
});
```

### Loading & Empty States
```typescript
// List component dynamically shows loading/empty states
useConditionalClassList(containerRef, {
  'loading': isLoading,
  'empty': results.length === 0
});
```

## 🔧 API Methods Used

### Core Functions
- `setClassList(elements, ...inputs)` - Add classes to element(s)
- `unsetClassList(elements, ...inputs)` - Remove classes from element(s)  
- `toggleClassList(elements, ...inputs)` - Toggle classes on element(s)

### Declarative Hooks
- `useConditionalClassList(elementRef, conditions)` - Fine-grained conditional class management
- `useElementClassList(elementRef, inputs)` - Declarative class management for ref'd elements

### Enhanced JSX
- `createEnhancedElement(type, props, children)` - Programmatic element creation with classList support
- `h(type, props, children)` - Custom JSX factory with classList prop support

## 📈 Performance Impact

The integration demonstrates measurable performance improvements:

- **Reduced re-renders**: Declarative hooks manage DOM directly without component updates
- **Batch operations**: Multiple class changes are efficiently batched
- **Memory efficiency**: Automatic cleanup prevents memory leaks
- **Fast paths**: Optimized code paths for common scenarios

## 🎯 Best Practices Demonstrated

1. **Use declarative hooks for component-driven state**
2. **Use programmatic APIs for user interactions and animations**
3. **Leverage ref-based management for complex state scenarios**
4. **Combine with existing useClassNames for hybrid approaches**
5. **Take advantage of automatic cleanup for lifecycle management**

This integration showcases the versatility and power of the new classList APIs while maintaining compatibility with existing patterns and performance characteristics.