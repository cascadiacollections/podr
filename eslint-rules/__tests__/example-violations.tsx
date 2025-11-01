// Example file demonstrating the no-jsx-literals rule violations
import { h, FunctionComponent } from 'preact';
import { useCallback, useEffect, useMemo } from 'preact/hooks';

// ❌ BAD: Array literal in JSX prop
export function BadArrayLiteral() {
  return <div items={[]} />; // This will cause re-render on every render
}

// ✅ GOOD: Use a constant
const EMPTY_ITEMS = [];
export function GoodArrayConstant() {
  return <div items={EMPTY_ITEMS} />;
}

// ❌ BAD: Object literal in JSX prop
export function BadObjectLiteral() {
  return <div style={{ color: 'red' }} />; // Creates new object every render
}

// ✅ GOOD: Use a constant
const RED_STYLE = { color: 'red' };
export function GoodObjectConstant() {
  return <div style={RED_STYLE} />;
}

// ❌ BAD: Inline arrow function
export function BadInlineFunction() {
  return (
    <button onClick={() => console.log('clicked')}>
      Click me
    </button>
  );
}

// ✅ GOOD: Use useCallback
export function GoodUseCallback() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <button onClick={handleClick}>Click me</button>;
}

// ❌ BAD: Array literal in dependency array
export function BadDependencyArray({ id }: { id: number }) {
  useEffect(() => {
    console.log('Effect with array literal in deps');
  }, [[]]); // This will cause effect to run on every render!
}

// ✅ GOOD: Don't use literals in dependency arrays
export function GoodDependencyArray({ id }: { id: number }) {
  useEffect(() => {
    console.log('Effect with proper deps');
  }, [id]);
}

// ✅ GOOD: Use useMemo for complex computed objects
export function GoodUseMemo({ color }: { color: string }) {
  const style = useMemo(() => ({
    color,
    backgroundColor: 'white'
  }), [color]);
  
  return <div style={style}>Styled content</div>;
}

// Multiple violations example
export function MultipleViolations() {
  return (
    <div
      items={[]} // ❌ Array literal
      style={{}} // ❌ Object literal
      onClick={() => {}} // ❌ Inline function
    />
  );
}
