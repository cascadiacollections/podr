# ESLint Integration for Podr

## Overview

This document describes the ESLint setup for the Podr project, including the integration of popular React performance linting rules that prevent unnecessary re-renders caused by array and object literals in JSX.

## Configuration

The project uses **ESLint 9.x** with the **flat config format** (`eslint.config.js`).

### Key Components

1. **`eslint.config.js`** - Main ESLint configuration file
2. **`eslint-plugin-react`** - Standard React linting rules (including `jsx-no-bind`)
3. **`eslint-plugin-react-perf`** - Performance-focused React linting rules
4. **`@typescript-eslint/parser@^8.46.2`** - TypeScript parser for ESLint 9

## Running ESLint

### Via npm/yarn scripts

```bash
# Lint all source files
yarn lint

# Lint and auto-fix issues (where possible)
yarn lint:fix
```

### Via npx

```bash
# Lint specific files
npx eslint src/ui/App.tsx

# Lint entire directory
npx eslint src/

# Lint with auto-fix
npx eslint src/ --fix
```

## Performance Rules

### Purpose

These rules prevent the common pitfall of using array and object literals in JSX props and React/Preact hooks, which causes unnecessary re-renders due to reference inequality (`[] !== []`, `{} !== {}`).

### Enabled Rules

#### 1. `react/jsx-no-bind`

Prevents creating new functions in JSX props, which causes child components to re-render unnecessarily.

```tsx
❌ <button onClick={() => console.log('click')}>Click</button>
✅ const handleClick = useCallback(() => console.log('click'), []);
   <button onClick={handleClick}>Click</button>
```

**Configuration:**
```javascript
'react/jsx-no-bind': ['error', {
  allowArrowFunctions: false,
  allowBind: false,
  allowFunctions: false,
  ignoreRefs: true,
  ignoreDOMComponents: false
}]
```

#### 2. `react-perf/jsx-no-new-array-as-prop`

Prevents passing new array literals as JSX props.

```tsx
❌ <Component items={[]} />
✅ const EMPTY_ITEMS = []; 
   <Component items={EMPTY_ITEMS} />
```

#### 3. `react-perf/jsx-no-new-object-as-prop`

Prevents passing new object literals as JSX props.

```tsx
❌ <Component style={{ color: 'red' }} />
✅ const STYLE = { color: 'red' }; 
   <Component style={STYLE} />

// Or for dynamic values:
✅ const style = useMemo(() => ({ color }), [color]);
   <Component style={style} />
```

#### 4. `react-perf/jsx-no-new-function-as-prop`

Prevents passing new function expressions as JSX props (complements `jsx-no-bind`).

```tsx
❌ <Component onEvent={function() { }} />
✅ const handleEvent = useCallback(() => { }, []);
   <Component onEvent={handleEvent} />
```

### Test File Configuration

For test files (`__tests__/`, `*.test.*`), the rules are relaxed:
- `react/jsx-no-bind`: Disabled (off)
- `react-perf/jsx-no-new-object-as-prop`: Warning only
- `react-perf/jsx-no-new-array-as-prop`: Warning only
- `react-perf/jsx-no-new-function-as-prop`: Disabled (off)

This allows tests to use literals naturally for test data without triggering errors.

### Common Fixes

#### 1. Extract constants

```tsx
// Before
function Component() {
  return <List items={[]} />;
}

// After
const EMPTY_ITEMS = [];
function Component() {
  return <List items={EMPTY_ITEMS} />;
}
```

#### 2. Use useMemo for complex objects

```tsx
// Before
function Component({ color }) {
  return <div style={{ color, backgroundColor: 'white' }} />;
}

// After
import { useMemo } from 'preact/hooks';

function Component({ color }) {
  const style = useMemo(() => ({
    color,
    backgroundColor: 'white'
  }), [color]);
  
  return <div style={style} />;
}
```

#### 3. Use useCallback for functions

```tsx
// Before
function Component() {
  return <button onClick={() => console.log('clicked')}>Click</button>;
}

// After
import { useCallback } from 'preact/hooks';

function Component() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <button onClick={handleClick}>Click</button>;
}
```

## Current Status

As of the latest lint run:
- **Multiple errors detected** in production code
- Most errors are in:
  - `src/ui/App.tsx` - Inline arrow functions in JSX
  - `src/ui/AppFunctional.tsx` - Inline arrow functions in JSX
  - `src/ui/Result.tsx` - Object literals and inline functions

These should be addressed to improve application performance and prevent unnecessary re-renders.

## Performance Impact

ESLint runs are typically fast:
- Initial run: ~2-3 seconds
- Subsequent runs with cache: <1 second

The `.eslintcache` file is git-ignored to speed up repeated lints.

## Why These Rules Matter

### Performance Impact Example

```tsx
// ❌ BAD - Child re-renders on every parent render
function Parent() {
  const [count, setCount] = useState(0);
  
  return (
    <>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveChild onClick={() => console.log('click')} />
    </>
  );
}

// ✅ GOOD - Child only re-renders when needed
function Parent() {
  const [count, setCount] = useState(0);
  const handleIncrement = useCallback(() => setCount(c => c + 1), []);
  const handleChildClick = useCallback(() => console.log('click'), []);
  
  return (
    <>
      <button onClick={handleIncrement}>Count: {count}</button>
      <ExpensiveChild onClick={handleChildClick} />
    </>
  );
}
```

In the bad example, `ExpensiveChild` re-renders every time `count` changes because it receives a new function reference. In the good example, the memoized callback prevents unnecessary re-renders.

## Troubleshooting

### Issue: Parser errors with TypeScript

**Solution**: The project uses `@typescript-eslint/parser@^8.46.2` which is compatible with TypeScript 5.4.5 and ESLint 9.x.

### Issue: Rules not catching violations

**Solution**: Check if the file is in a test directory (`__tests__/`) which has relaxed rules.

### Issue: Too many errors

**Solution**: Focus on fixing one component at a time. Start with the most frequently rendered components for maximum performance impact.

## Future Improvements

1. **Full Heft Integration**: Complete integration with the Heft build pipeline
2. **CI/CD**: Add ESLint checks to GitHub Actions workflows
3. **Pre-commit Hooks**: Add ESLint to git pre-commit hooks
4. **Gradual Adoption**: Fix violations incrementally, starting with critical paths

## References

- [ESLint 9 Documentation](https://eslint.org/docs/latest/)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react)
- [eslint-plugin-react-perf](https://github.com/cvazac/eslint-plugin-react-perf)
- [React useCallback](https://react.dev/reference/react/useCallback)
- [React useMemo](https://react.dev/reference/react/useMemo)
- [Preact Hooks](https://preactjs.com/guide/v10/hooks/)
