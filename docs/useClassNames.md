# useClassNames Hook

A highly optimized, TypeScript-first hook for CSS class name concatenation optimized for Preact applications, prioritizing runtime performance and minimal memory footprint.

## Overview

The `useClassNames` hook provides the most efficient way to conditionally compose CSS class names, designed for maximum performance in production applications. A separate debug-enabled hook is available for development scenarios.

## Key Performance Features

- 🚀 **Zero Debug Overhead**: Main hook has no debugging computation in any environment
- 🧠 **Intelligent Caching**: WeakMap-based caching for object inputs
- ⚡ **Optimized String Operations**: Minimal memory allocations with efficient algorithms
- 🎯 **Direct Dependency Tracking**: Leverages Preact's efficient re-render prevention
- 📦 **Minimal Memory Footprint**: Streamlined execution paths optimized for the 99% use case
- ⚛️ **Preact Optimizations**: Designed specifically for Preact's reconciliation patterns

## API Reference

### `useClassNames(...inputs)` - Main Performance Hook

The primary hook optimized for production use, returning only the className string for maximum performance.

```typescript
function useClassNames(...inputs: ClassNameInput[]): string
```

**Best for:** Production applications, performance-critical components, 99% of use cases.

### `useClassNamesWithDebug(...inputs)` - Development Hook

Debug-enabled version with comprehensive development tools and performance metrics.

```typescript
function useClassNamesWithDebug(...inputs: ClassNameInput[]): UseClassNamesWithDebugResult

interface UseClassNamesWithDebugResult {
  readonly className: string;
  readonly debug: ClassNameDebugInfo;
}

interface ClassNameDebugInfo {
  readonly finalClassName: string;
  readonly inputCount: number;
  readonly resolvedClasses: ReadonlyArray<string>;
  readonly skippedInputs: ReadonlyArray<unknown>;
  readonly computationTime: number;
}
```

**Best for:** Development debugging, troubleshooting complex conditional logic, performance analysis.

### `useClassNamesSimple(...inputs)` - ⚠️ Deprecated

Legacy hook maintained for compatibility. Use `useClassNames` instead.

```typescript
function useClassNamesSimple(...inputs: ClassNameInput[]): string
```

- ✅ **Input Preservation**: No mutation of input arrays, objects, or any other data structures
- ✅ **Frozen Debug Data**: Debug arrays are frozen with `Object.freeze()` to prevent accidental mutations
- ✅ **Functional Operations**: Uses `map`, `flatMap`, `filter`, and spread operators instead of mutating operations
- ✅ **No Side Effects**: Pure functional approach with no external state modifications

### Immutability Examples

```tsx
// Input arrays remain unchanged
## Input Types

All hooks support the same flexible input types:

```typescript
type ClassNameValue = string | number | boolean | null | undefined;
type ClassNameObject = Record<string, ClassNameValue>;
type ClassNameArray = ReadonlyArray<ClassNameInput>;
type ClassNameFunction = () => ClassNameInput;
type ClassNameInput = 
  | ClassNameValue 
  | ClassNameObject 
  | ClassNameArray 
  | ClassNameFunction;
```

## Basic Usage

### String Concatenation

```tsx
import { useClassNames } from '../utils/hooks';

const className = useClassNames('base-class', 'another-class');
// Result: "base-class another-class"
```

### Conditional Classes

```tsx
const className = useClassNames(
  'button',
  isActive && 'button--active',
  isDisabled && 'button--disabled'
);
// Result: "button button--active" (when isActive=true, isDisabled=false)
```

### Object-Based Conditionals (Recommended)

```tsx
const className = useClassNames('component', {
  'component--loading': isLoading,
  'component--error': hasError,
  'component--success': isSuccess
});
// Result: "component component--loading" (when isLoading=true, others false)
```

## Advanced Usage

### Mixed Input Types

```tsx
const className = useClassNames(
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

const className = useClassNames(
  block,
  modifiers.map(mod => `${block}--${mod}`),
  {
    [`${block}--loading`]: state.loading,
    [`${block}--disabled`]: state.disabled
  }
);
// Result: "card card--primary card--large card--loading"
```

## Development Debugging

### Using the Debug Hook

For development and troubleshooting, use `useClassNamesWithDebug`:

```tsx
import { useClassNamesWithDebug } from '../utils/hooks';

const { className, debug } = useClassNamesWithDebug(
  'test',
  { active: true, disabled: false }
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

The debug hook automatically logs skipped inputs in development mode:

```tsx
// This will log skipped inputs to console.debug in development
const { className } = useClassNamesWithDebug(
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
## Performance Guidelines

### Hook Selection

**Use `useClassNames` for:**
- Production components (99% of use cases)
- Performance-critical paths
- Components that re-render frequently
- When maximum runtime efficiency is needed

**Use `useClassNamesWithDebug` for:**
- Development debugging
- Troubleshooting complex conditional logic
- Performance analysis and optimization
- Understanding why certain classes are skipped

**Migration from deprecated:**
```tsx
// ❌ Deprecated
const className = useClassNamesSimple('btn', { active: isActive });

// ✅ New optimized API
const className = useClassNames('btn', { active: isActive });
```

### Performance Features

```tsx
// Fast path optimization for single strings
const className = useClassNames('single-class'); // Optimized path

// Intelligent caching for object inputs
const buttonStates = { active: true, disabled: false };
const className = useClassNames('btn', buttonStates); // Cached result

// Minimal memory allocations
const className = useClassNames(
  'base',
  condition && 'conditional', // No intermediate arrays
  { dynamic: isDynamic }      // Efficient object processing
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
  const className = useClassNames(
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
  const className = useClassNames(
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
  const className = useClassNames('form-field', {
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
const className = useClassNames('button', {
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
const finalClasses = [...new Set(validClasses)]; // always deduplicate

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
const className = useClassNames('base', {
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
const className = useClassNames('base', {
  active: isActive,
  disabled: isDisabled
});
```

## Best Practices

### 1. Immutability Guidelines

**✅ DO: Use the hook without worrying about data mutations**
```tsx
const myClasses = ['base', 'utility'];
const className = useClassNames(myClasses, { active: isActive });
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
const { debug } = useClassNames('test');
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
  'base--active': isActive
});
```

### 3. TypeScript Integration

**Prefer object syntax for conditionals**: More readable and type-safe
```tsx
// ✅ Good: Object syntax with clear conditions
const className = useClassNames('button', {
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
const className = useClassNames(
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
- Use debug mode in development to inspect resolved classes
- Ensure conditional logic is working as expected

**Performance issues**:
- Use `useClassNamesSimple` for hot paths and performance-critical components
- Memoize complex function inputs separately using `useCallback` or `useMemo`
- Avoid creating new objects/arrays on every render inside the hook inputs

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
  { conditional: someCondition }
);

// Inspect the debug information (available in development mode)
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
const className = useClassNames('base', {
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
const className = useClassNames('base', {
  active: isActive,
  disabled: isDisabled
});
```