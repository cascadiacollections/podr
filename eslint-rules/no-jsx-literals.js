/**
 * @fileoverview Prevents array and object literals in JSX that cause re-render issues
 * @author Podr Team
 * 
 * This rule prevents the common pitfall of using array/object literals in render functions
 * where reference equality matters, such as:
 * - JSX props (e.g., <Component items={[]} />)
 * - JSX attributes with object literals (e.g., <div style={{}} />)
 * - Hook dependency arrays with literals
 * - Inline functions that should be memoized
 * 
 * Rationale: In JavaScript, [] !== [] and {} !== {}, so passing new literals
 * on each render causes unnecessary re-renders and breaks memoization.
 */

'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow array and object literals in JSX props and hook dependencies to prevent unnecessary re-renders',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/cascadiacollections/podr'
    },
    messages: {
      noArrayLiteral: 'Avoid using array literal {{literal}} as a JSX prop. Use a constant, state, or useMemo to avoid unnecessary re-renders.',
      noObjectLiteral: 'Avoid using object literal {{literal}} as a JSX prop. Use a constant, state, or useMemo to avoid unnecessary re-renders.',
      noInlineFunction: 'Avoid using inline arrow function as a JSX prop. Use useCallback or define the function outside render to avoid unnecessary re-renders.',
      noLiteralInDeps: 'Avoid using {{type}} literal in dependency array. This will cause the effect/callback to run on every render.'
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowEmptyArray: {
            type: 'boolean',
            default: false
          },
          allowEmptyObject: {
            type: 'boolean',
            default: false
          },
          checkInlineFunctions: {
            type: 'boolean',
            default: true
          },
          checkHookDependencies: {
            type: 'boolean',
            default: true
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const allowEmptyArray = options.allowEmptyArray || false;
    const allowEmptyObject = options.allowEmptyObject || false;
    const checkInlineFunctions = options.checkInlineFunctions !== false;
    const checkHookDependencies = options.checkHookDependencies !== false;

    /**
     * Check if a node is a React/Preact hook that accepts dependencies
     */
    function isHookWithDependencies(node) {
      if (node.type !== 'CallExpression') return false;
      if (node.callee.type !== 'Identifier') return false;
      
      const hookName = node.callee.name;
      return ['useEffect', 'useCallback', 'useMemo', 'useLayoutEffect'].includes(hookName);
    }

    /**
     * Check if an array is empty
     */
    function isEmptyArray(node) {
      return node.type === 'ArrayExpression' && node.elements.length === 0;
    }

    /**
     * Check if an object is empty
     */
    function isEmptyObject(node) {
      return node.type === 'ObjectExpression' && node.properties.length === 0;
    }

    /**
     * Get source code text for error messages
     */
    function getNodeText(node) {
      const sourceCode = context.getSourceCode();
      const text = sourceCode.getText(node);
      return text.length > 20 ? text.substring(0, 20) + '...' : text;
    }

    /**
     * Check JSX attribute values for problematic literals
     */
    function checkJSXAttributeValue(node) {
      if (!node.value) return;

      // JSX expressions: <Component prop={value} />
      if (node.value.type === 'JSXExpressionContainer') {
        const expr = node.value.expression;

        // Check for array literals: <Component items={[]} />
        if (expr.type === 'ArrayExpression') {
          if (!allowEmptyArray || !isEmptyArray(expr)) {
            context.report({
              node: expr,
              messageId: 'noArrayLiteral',
              data: {
                literal: getNodeText(expr)
              }
            });
          }
        }

        // Check for object literals: <Component style={{}} />
        if (expr.type === 'ObjectExpression') {
          if (!allowEmptyObject || !isEmptyObject(expr)) {
            context.report({
              node: expr,
              messageId: 'noObjectLiteral',
              data: {
                literal: getNodeText(expr)
              }
            });
          }
        }

        // Check for inline arrow functions: <Component onClick={() => {}} />
        if (checkInlineFunctions && (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression')) {
          context.report({
            node: expr,
            messageId: 'noInlineFunction',
            data: {
              literal: getNodeText(expr)
            }
          });
        }
      }
    }

    /**
     * Check hook dependency arrays for literals
     */
    function checkHookDependenciesForLiterals(callNode) {
      if (!checkHookDependencies) return;
      if (!isHookWithDependencies(callNode)) return;

      // Get the dependency array argument (last argument for these hooks)
      const args = callNode.arguments;
      if (args.length < 2) return; // No dependency array provided

      const depsArg = args[args.length - 1];
      
      // Only check if it's an array expression
      if (depsArg.type !== 'ArrayExpression') return;

      // Check each element in the dependency array
      depsArg.elements.forEach(element => {
        if (!element) return; // Skip holes in array

        if (element.type === 'ArrayExpression') {
          context.report({
            node: element,
            messageId: 'noLiteralInDeps',
            data: {
              type: 'array'
            }
          });
        }

        if (element.type === 'ObjectExpression') {
          context.report({
            node: element,
            messageId: 'noLiteralInDeps',
            data: {
              type: 'object'
            }
          });
        }
      });
    }

    return {
      // Check JSX attributes
      JSXAttribute(node) {
        checkJSXAttributeValue(node);
      },

      // Check hook calls
      CallExpression(node) {
        checkHookDependenciesForLiterals(node);
      }
    };
  }
};
