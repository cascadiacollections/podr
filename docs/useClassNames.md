# useClassNames Hook

A performant, TypeScript-first hook for CSS class name concatenation in Preact/React applications.

## Overview

The `useClassNames` hook provides an efficient way to conditionally compose CSS class names with full TypeScript support, development debugging features, and optimized performance characteristics.

## Features

- 🚀 **Performance Optimized**: Memory-efficient with proper memoization
- 🔧 **TypeScript Native**: Full type safety with modern TypeScript features
- 🐛 **Development Debugging**: Comprehensive debugging tools for development
- ⚛️ **Framework Agnostic**: Compatible with both Preact and React
- 🎯 **Multiple Input Types**: Supports strings, objects, arrays, and functions
- 🔄 **Automatic Deduplication**: Removes duplicate class names by default
- 🛡️ **Error Resilient**: Graceful handling of edge cases and errors

## API Reference

### `useClassNames(...inputs, options?)`

Main hook that returns an object with className and optional debug information.

```typescript
function useClassNames(
  ...args: [...ClassNameInput[], UseClassNamesOptions?]
): UseClassNamesResult
```

### `useClassNamesSimple(...inputs)`

Simplified hook that returns only the className string for optimal performance.

```typescript
function useClassNamesSimple(...inputs: ClassNameInput[]): string
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

## Browser Compatibility

- Modern browsers with ES2018+ support
- Node.js 14+ for SSR environments
- Compatible with all major bundlers (Webpack, Vite, Parcel)

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

1. **Use the simple hook when possible**: `useClassNamesSimple` is more performant
2. **Enable debugging only in development**: Use conditional debugging based on environment
3. **Prefer object syntax for conditionals**: More readable than manual string concatenation
4. **Use BEM methodology**: Works excellently with the hook's features
5. **Memoize expensive computations**: The hook already memoizes, but complex functions should be memoized separately

## Troubleshooting

### Common Issues

**Classes not applying correctly**:
- Check that class names don't have leading/trailing spaces
- Verify CSS is properly loaded
- Use debug mode to inspect resolved classes

**Performance issues**:
- Use `useClassNamesSimple` for hot paths
- Memoize complex function inputs separately
- Avoid creating new objects/arrays on every render

**TypeScript errors**:
- Ensure inputs match the supported types
- Use proper typing for dynamic class generation
- Check that functions return valid ClassNameInput types