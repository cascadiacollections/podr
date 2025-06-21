# useClassNames Hook

A performant, TypeScript-first, immutable hook for CSS class name concatenation in Preact/React applications.

## Overview

The `useClassNames` hook provides an efficient way to conditionally compose CSS class names with full TypeScript support, development debugging features, immutable operations, and optimized performance characteristics.

## Features

- 🚀 **Performance Optimized**: Memory-efficient with proper memoization using `useMemo`
- 🔧 **TypeScript Native**: Full type safety with modern TypeScript features and strict typing
- 🛡️ **Immutable Operations**: No mutations of input data, following functional programming principles
- 🐛 **Development Debugging**: Comprehensive debugging tools with frozen arrays for development
- ⚛️ **Framework Agnostic**: Compatible with both Preact and React
- 🎯 **Multiple Input Types**: Supports strings, objects, arrays, functions, numbers, and booleans
- 🔄 **Automatic Deduplication**: Removes duplicate class names by default using immutable Set operations
- 🛡️ **Error Resilient**: Graceful handling of edge cases, circular references, and invalid inputs
- 🌍 **Unicode Support**: Full support for international characters in class names
- 📊 **Comprehensive Testing**: 46+ test cases covering all functionality and edge cases

## API Reference

### `useClassNames(...inputs, options?)`

Main hook that returns an object with className and optional debug information.

```typescript
function useClassNames(
  ...args: [...ClassNameInput[], UseClassNamesOptions?]
): UseClassNamesResult

interface UseClassNamesResult {
  readonly className: string;
  readonly debug?: ClassNameDebugInfo;
}
```

### `useClassNamesSimple(...inputs)`

Simplified hook that returns only the className string for optimal performance.

```typescript
function useClassNamesSimple(...inputs: ClassNameInput[]): string
```

## Immutability Guarantees

The hook follows strict immutability principles:

- ✅ **Input Preservation**: No mutation of input arrays, objects, or any other data structures
- ✅ **Frozen Debug Data**: Debug arrays are frozen with `Object.freeze()` to prevent accidental mutations
- ✅ **Functional Operations**: Uses `map`, `flatMap`, `filter`, and spread operators instead of mutating operations
- ✅ **No Side Effects**: Pure functional approach with no external state modifications

### Immutability Examples

```tsx
// Input arrays remain unchanged
const inputArray = ['base', 'conditional'];
const { className } = useClassNames(inputArray);
// inputArray is still ['base', 'conditional'] - unchanged

// Input objects remain unchanged  
const inputObject = { active: true, disabled: false };
const { className } = useClassNames('button', inputObject);
// inputObject is still { active: true, disabled: false } - unchanged

// Debug data is immutable
const { className, debug } = useClassNames('test', { enableDebug: true });
// debug.resolvedClasses is frozen - cannot be modified
// debug.skippedInputs is frozen - cannot be modified
```

## Basic Usage

### String Concatenation

```tsx
import { useClassNames } from '../utils/hooks';

const { className } = useClassNames('base-class', 'another-class');
// Result: "base-class another-class"
```

### Conditional Classes

```tsx
const { className } = useClassNames(
  'button',
  isActive && 'button--active',
  isDisabled && 'button--disabled'
);
// Result: "button button--active" (when isActive=true, isDisabled=false)
```

### Object-Based Conditionals

```tsx
const { className } = useClassNames('component', {
  'component--loading': isLoading,
  'component--error': hasError,
  'component--success': isSuccess
});
// Result: "component component--loading" (when isLoading=true, others false)
```

## Advanced Usage

### Mixed Input Types

```tsx
const { className } = useClassNames(
  'base',                           // string
  ['utility', 'classes'],           // array
  () => dynamic ? 'dynamic' : null, // function
  { conditional: isActive },        // object
  42                                // number
);
```

### BEM Methodology

```tsx
const block = 'card';
const modifiers = ['primary', 'large'];
const state = { loading: true, disabled: false };

const { className } = useClassNames(
  block,
  modifiers.map(mod => `${block}--${mod}`),
  {
    [`${block}--loading`]: state.loading,
    [`${block}--disabled`]: state.disabled
  }
);
// Result: "card card--primary card--large card--loading"
```

### Custom Configuration

```tsx
const { className } = useClassNames(
  'class1',
  'class2',
  'class1', // duplicate
  {
    separator: '|',      // Custom separator
    deduplicate: false,  // Keep duplicates
    enableDebug: true    // Enable debugging
  }
);
// Result: "class1|class2|class1"
```

## Development Debugging

### Debug Information

```tsx
const { className, debug } = useClassNames(
  'test',
  { active: true, disabled: false },
  { enableDebug: true }
);

console.log(debug);
/*
{
  finalClassName: "test active",
  inputCount: 2,
  resolvedClasses: ["test", "active"],
  skippedInputs: [{ disabled: false }],
  computationTime: 0.125
}
*/
```

### Development Logging

The hook automatically logs skipped inputs in development mode:

```tsx
// This will log skipped inputs to console.debug in development
const { className } = useClassNames(
  'valid',
  null,           // skipped
  undefined,      // skipped
  false,          // skipped
  ''             // skipped
);
```

## Performance Optimizations

### Memoization

The hook uses React's `useMemo` for optimal performance:

```tsx
// This will only recompute when isLoading or hasError changes
const { className } = useClassNames('component', {
  'loading': isLoading,
  'error': hasError
});
```

### Simple Hook for Performance

Use `useClassNamesSimple` when debugging is not needed:

```tsx
// Optimized version without debugging overhead
const className = useClassNamesSimple(
  'component',
  isActive && 'active'
);
```

## Real-World Examples

### Component State Management

```tsx
function Button({ 
  children, 
  variant = 'default', 
  size = 'medium', 
  disabled = false, 
  loading = false 
}) {
  const { className } = useClassNames(
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    {
      'btn--disabled': disabled,
      'btn--loading': loading,
      'btn--interactive': !disabled && !loading
    }
  );

  return (
    <button className={className} disabled={disabled || loading}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}
```

### Responsive Design

```tsx
function Card({ featured, size }) {
  const { className } = useClassNames(
    'card',
    // Responsive classes
    ['md:card--horizontal', 'lg:card--featured'],
    // Dynamic sizing
    () => size ? `card--${size}` : 'card--default',
    // Feature state
    { 'card--featured': featured }
  );

  return <div className={className}>...</div>;
}
```

### Form Validation

```tsx
function FormField({ name, error, touched, required }) {
  const { className } = useClassNames('form-field', {
    'form-field--error': error && touched,
    'form-field--required': required,
    'form-field--valid': !error && touched
  });

  return (
    <div className={className}>
      <input name={name} />
      {error && touched && <span className="error">{error}</span>}
    </div>
  );
}
```

## Type Safety

The hook provides comprehensive TypeScript support:

```typescript
// All input types are properly typed
type ClassNameInput = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined
  | Record<string, unknown>
  | ReadonlyArray<ClassNameInput>
  | (() => ClassNameInput);

// Return types are strictly typed
interface UseClassNamesResult {
  readonly className: string;
  readonly debug?: ClassNameDebugInfo;
}
```

## Architecture & Design Principles

### Immutable-First Design

The hook is built on functional programming principles:

```typescript
// Internal implementation uses immutable operations
function resolveClassNames(input: ClassNameInput): {
  readonly classes: ReadonlyArray<string>;
  readonly skipped: ReadonlyArray<unknown>;
} {
  // Uses pure functions and immutable data structures
  // No mutations of input parameters
  // Returns readonly arrays to prevent external mutations
}
```

### Type Safety

Comprehensive TypeScript support with strict typing:

```typescript
// All input types are strictly defined
type ClassNameInput = 
  | string | number | boolean | null | undefined
  | Record<string, unknown>
  | ReadonlyArray<ClassNameInput>
  | (() => ClassNameInput);

// Return types enforce immutability
interface UseClassNamesResult {
  readonly className: string;
  readonly debug?: ClassNameDebugInfo;
}
```

### Performance Considerations

- **Memoization**: Uses React's `useMemo` for optimal re-render prevention
- **Lazy Evaluation**: Debug information only computed when enabled
- **Efficient Deduplication**: Uses native `Set` for O(n) deduplication
- **Minimal Allocations**: Reduces temporary object creation

### Error Boundaries

Graceful handling of all edge cases:

- **Invalid Inputs**: Safely handles symbols, circular references, and unknown types
- **Function Errors**: Catches and logs execution errors without breaking
- **Unicode Support**: Full international character support
- **Large Datasets**: Efficiently handles thousands of class inputs

## Code Style Guidelines

### 1. Consistent Naming Conventions

```tsx
// ✅ Use descriptive, consistent naming
const { className } = useClassNames('button', {
  'button--primary': isPrimary,
  'button--large': size === 'large',
  'button--disabled': disabled
});

// ✅ Use readonly arrays for configurations
const CSS_CLASSES = {
  CONTAINER: 'episodes-container',
  LOADING: 'loading',
  EMPTY: 'empty-state',
} as const;
```

### 2. Immutable Data Patterns

```tsx
// ✅ Spread operators for immutable updates
const finalClasses = deduplicate 
  ? [...new Set(validClasses)] 
  : [...validClasses];

// ✅ Object.freeze for development data
result.debug = {
  finalClassName: className,
  resolvedClasses: Object.freeze([...finalClasses]),
  skippedInputs: Object.freeze([...allSkipped]),
  computationTime
};
```

### 3. Functional Composition

```tsx
// ✅ Compose operations using functional methods
const results = inputs.map(input => resolveClassNames(input));
const allClasses = results.flatMap(result => result.classes);
const allSkipped = results.flatMap(result => result.skipped);
```

## Migration Guide

### From Manual String Concatenation

```tsx
// Before
const className = useMemo(() => {
  let classes = 'base';
  if (isActive) classes += ' active';
  if (hasError) classes += ' error';
  return classes;
}, [isActive, hasError]);

// After
const { className } = useClassNames('base', {
  active: isActive,
  error: hasError
});
```

### From classnames Library

```tsx
// Before (classnames library)
import classNames from 'classnames';
const className = classNames('base', {
  active: isActive,
  disabled: isDisabled
});

// After (useClassNames hook)
const { className } = useClassNames('base', {
  active: isActive,
  disabled: isDisabled
});
```

## Best Practices

### 1. Immutability Guidelines

**✅ DO: Use the hook without worrying about data mutations**
```tsx
const myClasses = ['base', 'utility'];
const { className } = useClassNames(myClasses, { active: isActive });
// myClasses remains unchanged - safe to reuse
```

**✅ DO: Rely on the hook's immutable operations**
```tsx
// The hook uses immutable methods internally:
// - Array.map() instead of for loops with push()
// - Array.flatMap() for nested structures
// - [...new Set()] for deduplication
// - Object.freeze() for debug data
```

**❌ DON'T: Try to modify the returned debug data**
```tsx
const { debug } = useClassNames('test', { enableDebug: true });
// This will throw an error in strict mode:
// debug.resolvedClasses.push('new-class'); // ❌ Error!
```

### 2. Performance Optimization

**Use the simple hook when possible**: `useClassNamesSimple` is more performant
```tsx
// For simple cases without debugging needs
const className = useClassNamesSimple('base', { active: isActive });
```

**Enable debugging only in development**: Use conditional debugging based on environment
```tsx
const { className, debug } = useClassNames('base', {
  enableDebug: process.env.NODE_ENV === 'development'
});
```

### 3. TypeScript Integration

**Prefer object syntax for conditionals**: More readable and type-safe
```tsx
// ✅ Good: Object syntax with clear conditions
const { className } = useClassNames('button', {
  'button--primary': variant === 'primary',
  'button--disabled': disabled,
  'button--loading': isLoading
});

// ❌ Less ideal: Manual string concatenation
const className = useMemo(() => {
  let result = 'button';
  if (variant === 'primary') result += ' button--primary';
  if (disabled) result += ' button--disabled';
  return result;
}, [variant, disabled]);
```

### 4. Functional Programming Patterns

**Use function inputs for dynamic logic**:
```tsx
const { className } = useClassNames(
  'card',
  // Pure function - no side effects
  () => size === 'large' ? 'card--xl' : `card--${size}`,
  // Object conditions
  { 'card--featured': featured },
  // Array for multiple utilities
  ['shadow', 'rounded']
);
```

## Browser Compatibility

- Modern browsers with ES2018+ support (for spread operators, `flatMap`, etc.)
- Node.js 14+ for SSR environments
- Compatible with all major bundlers (Webpack, Vite, Parcel, etc.)
- Full TypeScript 4.0+ support with strict mode compatibility

## Troubleshooting

### Common Issues

**Classes not applying correctly**:
- Check that class names don't have leading/trailing spaces (automatically trimmed)
- Verify CSS is properly loaded and classes exist
- Use debug mode to inspect resolved classes: `{ enableDebug: true }`
- Ensure conditional logic is working as expected

**Performance issues**:
- Use `useClassNamesSimple` for hot paths and performance-critical components
- Memoize complex function inputs separately using `useCallback` or `useMemo`
- Avoid creating new objects/arrays on every render inside the hook inputs
- Consider using the `deduplicate: false` option if you have many unique classes

**TypeScript errors**:
- Ensure inputs match the supported `ClassNameInput` types
- Use proper typing for dynamic class generation functions
- Check that functions return valid `ClassNameInput` types
- Use `as const` for object configurations to improve type inference

**Memory leaks or performance degradation**:
- Verify you're not passing different function references on each render
- Use `useCallback` for function inputs that depend on props or state
- Avoid deeply nested arrays that change frequently
- Consider using the simple hook variant for frequently updating components

### Debug Mode Usage

```tsx
// Enable debug mode to troubleshoot issues
const { className, debug } = useClassNames(
  'problematic-classes',
  { conditional: someCondition },
  { enableDebug: true }
);

// Inspect the debug information
console.log('Final className:', debug.finalClassName);
console.log('Resolved classes:', debug.resolvedClasses);
console.log('Skipped inputs:', debug.skippedInputs);
console.log('Computation time:', debug.computationTime, 'ms');
```

### Migration Troubleshooting

**From manual string concatenation**:
```tsx
// Before: Manual concatenation (error-prone)
const className = useMemo(() => {
  let result = 'base';
  if (isActive) result += ' active';
  if (hasError) result += ' error';
  return result;
}, [isActive, hasError]);

// After: Hook-based (immutable and safer)
const { className } = useClassNames('base', {
  active: isActive,
  error: hasError
});
```

**From classnames library**:
```tsx
// Before: classnames library
import classNames from 'classnames';
const className = classNames('base', {
  active: isActive,
  disabled: isDisabled
});

// After: useClassNames hook (better performance and debugging)
const { className } = useClassNames('base', {
  active: isActive,
  disabled: isDisabled
});
```