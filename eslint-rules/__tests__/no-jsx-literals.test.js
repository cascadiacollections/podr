/**
 * @fileoverview Tests for no-jsx-literals ESLint rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../no-jsx-literals');

// Use the TypeScript parser for testing
const parserOptions = {
  ecmaVersion: 2022,
  sourceType: 'module',
  ecmaFeatures: {
    jsx: true
  }
};

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions
  }
});

ruleTester.run('no-jsx-literals', rule, {
  valid: [
    // Valid: Using constants for arrays
    {
      code: `
        const EMPTY_ARRAY = [];
        function Component() {
          return <div items={EMPTY_ARRAY} />;
        }
      `
    },
    
    // Valid: Using constants for objects
    {
      code: `
        const DEFAULT_STYLE = { color: 'red' };
        function Component() {
          return <div style={DEFAULT_STYLE} />;
        }
      `
    },
    
    // Valid: Using state or props
    {
      code: `
        function Component({ items }) {
          return <div items={items} />;
        }
      `
    },
    
    // Valid: Using callback defined outside render
    {
      code: `
        function Component() {
          const handleClick = () => console.log('clicked');
          return <button onClick={handleClick}>Click</button>;
        }
      `
    },
    
    // Valid: Using useCallback for inline functions
    {
      code: `
        import { useCallback } from 'preact/hooks';
        function Component() {
          const handleClick = useCallback(() => console.log('clicked'), []);
          return <button onClick={handleClick}>Click</button>;
        }
      `
    },
    
    // Valid: Using useMemo for complex objects
    {
      code: `
        import { useMemo } from 'preact/hooks';
        function Component({ data }) {
          const style = useMemo(() => ({ color: data.color }), [data.color]);
          return <div style={style} />;
        }
      `
    },
    
    // Valid: String literals (these are fine)
    {
      code: `
        function Component() {
          return <div className="container" title="Test" />;
        }
      `
    },
    
    // Valid: Numbers and booleans (primitives are fine)
    {
      code: `
        function Component() {
          return <input type="text" maxLength={100} disabled={false} />;
        }
      `
    }
  ],

  invalid: [
    // Invalid: Array literal in JSX prop
    {
      code: `
        function Component() {
          return <div items={[]} />;
        }
      `,
      errors: [{
        messageId: 'noArrayLiteral',
        type: 'ArrayExpression'
      }]
    },
    
    // Invalid: Non-empty array literal in JSX prop
    {
      code: `
        function Component() {
          return <div items={[1, 2, 3]} />;
        }
      `,
      errors: [{
        messageId: 'noArrayLiteral',
        type: 'ArrayExpression'
      }]
    },
    
    // Invalid: Object literal in JSX prop
    {
      code: `
        function Component() {
          return <div style={{}} />;
        }
      `,
      errors: [{
        messageId: 'noObjectLiteral',
        type: 'ObjectExpression'
      }]
    },
    
    // Invalid: Non-empty object literal in JSX prop
    {
      code: `
        function Component() {
          return <div style={{ color: 'red' }} />;
        }
      `,
      errors: [{
        messageId: 'noObjectLiteral',
        type: 'ObjectExpression'
      }]
    },
    
    // Invalid: Inline arrow function in JSX prop
    {
      code: `
        function Component() {
          return <button onClick={() => console.log('clicked')}>Click</button>;
        }
      `,
      errors: [{
        messageId: 'noInlineFunction',
        type: 'ArrowFunctionExpression'
      }]
    },
    
    // Invalid: Inline function expression in JSX prop
    {
      code: `
        function Component() {
          return <button onClick={function() { console.log('clicked'); }}>Click</button>;
        }
      `,
      errors: [{
        messageId: 'noInlineFunction',
        type: 'FunctionExpression'
      }]
    },
    
    // Invalid: Array literal in useEffect dependency array
    {
      code: `
        import { useEffect } from 'preact/hooks';
        function Component() {
          useEffect(() => {
            console.log('effect');
          }, [[]]);
        }
      `,
      errors: [{
        messageId: 'noLiteralInDeps',
        type: 'ArrayExpression'
      }]
    },
    
    // Invalid: Object literal in useCallback dependency array
    {
      code: `
        import { useCallback } from 'preact/hooks';
        function Component() {
          const cb = useCallback(() => {
            console.log('callback');
          }, [{}]);
        }
      `,
      errors: [{
        messageId: 'noLiteralInDeps',
        type: 'ObjectExpression'
      }]
    },
    
    // Invalid: Multiple violations in one component
    {
      code: `
        function Component() {
          return (
            <div 
              items={[]} 
              style={{}} 
              onClick={() => {}}
            />
          );
        }
      `,
      errors: [
        { messageId: 'noArrayLiteral', type: 'ArrayExpression' },
        { messageId: 'noObjectLiteral', type: 'ObjectExpression' },
        { messageId: 'noInlineFunction', type: 'ArrowFunctionExpression' }
      ]
    }
  ]
});

console.log('All tests passed!');
