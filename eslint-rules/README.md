# Custom ESLint Rules for Podr

## Overview

This directory contains custom ESLint rules specific to the Podr project. These rules help maintain code quality and prevent common performance pitfalls.

## Rules

### `no-jsx-literals`

**Purpose:** Prevents unnecessary re-renders caused by using array and object literals in JSX props and React/Preact hooks.

**Problem:** In JavaScript, reference equality is used for comparisons, so `[] !== []` and `{} !== {}`. When you pass a new literal on each render, React/Preact components will re-render unnecessarily because the props appear to have changed.

**Examples:**

#### ❌ Bad (causes re-renders)

```tsx
// Array literal - creates new array on every render
function Component() {
  return <List items={[]} />;
}

// Object literal - creates new object on every render
function Component() {
  return <div style={{ color: 'red' }} />;
}

// Inline function - creates new function on every render
function Component() {
  return <button onClick={() => console.log('click')}>Click</button>;
}

// Literal in dependency array - causes effect to run every render
function Component() {
  useEffect(() => {
    // This runs on every render!
  }, [[]]);
}
```

#### ✅ Good (prevents re-renders)

```tsx
// Use constants outside the component
const EMPTY_ITEMS = [];
const RED_STYLE = { color: 'red' };

function Component() {
  return (
    <>
      <List items={EMPTY_ITEMS} />
      <div style={RED_STYLE} />
    </>
  );
}

// Use useCallback for functions
function Component() {
  const handleClick = useCallback(() => {
    console.log('click');
  }, []);
  
  return <button onClick={handleClick}>Click</button>;
}

// Use useMemo for complex objects
function Component({ color }) {
  const style = useMemo(() => ({ 
    color, 
    backgroundColor: 'white' 
  }), [color]);
  
  return <div style={style} />;
}

// Proper dependency arrays
function Component({ id }) {
  useEffect(() => {
    fetchData(id);
  }, [id]); // Only re-run when id changes
}
```

**Configuration:**

The rule is configured in `eslint.config.js` with these options:

```javascript
'podr/no-jsx-literals': ['error', {
  allowEmptyArray: false,        // Disallow empty arrays
  allowEmptyObject: false,       // Disallow empty objects
  checkInlineFunctions: true,    // Check for inline arrow functions
  checkHookDependencies: true    // Check hook dependency arrays
}]
```

For test files, the rule is relaxed:

```javascript
// In __tests__ directories and *.test.* files:
'podr/no-jsx-literals': ['warn', {
  allowEmptyArray: true,         // Allow empty arrays in tests
  allowEmptyObject: true,        // Allow empty objects in tests
  checkInlineFunctions: false,   // Don't check inline functions in tests
  checkHookDependencies: true    // Still check dependency arrays
}]
```

**Messages:**

- `noArrayLiteral`: Avoid using array literal as a JSX prop
- `noObjectLiteral`: Avoid using object literal as a JSX prop
- `noInlineFunction`: Avoid using inline arrow function as a JSX prop
- `noLiteralInDeps`: Avoid using array/object literal in dependency array

## Running ESLint

```bash
# Lint all files
npx eslint .

# Lint specific file
npx eslint src/ui/App.tsx

# Lint and auto-fix (where possible)
npx eslint . --fix

# Lint as part of build
npx heft build
```

## Testing Rules

The custom rules have their own test suite:

```bash
# Run rule tests
node eslint-rules/__tests__/no-jsx-literals.test.js
```

## References

- [React - Passing Functions to Components](https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children)
- [React useCallback](https://react.dev/reference/react/useCallback)
- [React useMemo](https://react.dev/reference/react/useMemo)
- [Preact Hooks](https://preactjs.com/guide/v10/hooks/)
