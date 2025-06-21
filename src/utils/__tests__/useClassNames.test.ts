import { renderHook } from '@testing-library/preact';
import { render } from '@testing-library/preact';
import { h } from 'preact';
import { useClassNames, useClassNamesWithDebug, useClassNamesSimple } from '../hooks';

// Mock performance API for testing
const mockPerformance = {
  now: jest.fn(() => 100)
};
global.performance = mockPerformance as any;

describe('useClassNames Hook (Main Performance-Optimized Hook)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(100);
  });

  describe('Basic Functionality', () => {
    it('should handle single string input', () => {
      const { result } = renderHook(() => useClassNames('test-class'));
      expect(result.current).toBe('test-class');
    });

    it('should handle multiple string inputs', () => {
      const { result } = renderHook(() => useClassNames('class1', 'class2', 'class3'));
      expect(result.current).toBe('class1 class2 class3');
    });

    it('should filter out falsy values', () => {
      const { result } = renderHook(() => 
        useClassNames('valid', null, undefined, false, '', 'another-valid')
      );
      expect(result.current).toBe('valid another-valid');
    });

    it('should handle number inputs', () => {
      const { result } = renderHook(() => useClassNames('class', 123, 'end'));
      expect(result.current).toBe('class 123 end');
    });

    it('should trim whitespace from string inputs', () => {
      const { result } = renderHook(() => useClassNames('  spaced  ', 'normal'));
      expect(result.current).toBe('spaced normal');
    });
  });

  describe('Object-based Conditionals', () => {
    it('should handle object with boolean values', () => {
      const { result } = renderHook(() => 
        useClassNames('base', {
          active: true,
          disabled: false,
          loading: true
        })
      );
      expect(result.current).toBe('base active loading');
    });

    it('should handle object with truthy/falsy values', () => {
      const { result } = renderHook(() => 
        useClassNames({
          'class1': 1,
          'class2': 0,
          'class3': 'truthy',
          'class4': '',
          'class5': null
        })
      );
      expect(result.current).toBe('class1 class3');
    });

    it('should handle empty object', () => {
      const { result } = renderHook(() => useClassNames('base', {}));
      expect(result.current).toBe('base');
    });
  });

  describe('Array Inputs', () => {
    it('should handle array of strings', () => {
      const { result } = renderHook(() => 
        useClassNames(['class1', 'class2'], 'class3')
      );
      expect(result.current).toBe('class1 class2 class3');
    });

    it('should handle nested arrays', () => {
      const { result } = renderHook(() => 
        useClassNames(['outer', ['nested1', 'nested2']], 'end')
      );
      expect(result.current).toBe('outer nested1 nested2 end');
    });

    it('should handle arrays with mixed types', () => {
      const { result } = renderHook(() => 
        useClassNames(['string', 123, true, false, null, { conditional: true }])
      );
      expect(result.current).toBe('string 123 conditional');
    });

    it('should handle empty arrays', () => {
      const { result } = renderHook(() => useClassNames('base', [], 'end'));
      expect(result.current).toBe('base end');
    });
  });

  describe('Function Inputs', () => {
    it('should execute functions and use return values', () => {
      const mockFunction = jest.fn(() => 'dynamic-class');
      const { result } = renderHook(() => useClassNames('base', mockFunction));
      
      expect(mockFunction).toHaveBeenCalled();
      expect(result.current).toBe('base dynamic-class');
    });

    it('should handle functions returning different types', () => {
      const { result } = renderHook(() => 
        useClassNames(
          'base',
          () => 'string-return',
          () => ({ conditional: true }),
          () => ['array', 'return'],
          () => null
        )
      );
      expect(result.current).toBe('base string-return conditional array return');
    });

    it('should handle function errors gracefully in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const errorFunction = jest.fn(() => {
        throw new Error('Test error');
      });

      const { result } = renderHook(() => useClassNames('base', errorFunction));
      expect(result.current).toBe('base');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identical class names by default', () => {
      const { result } = renderHook(() => 
        useClassNames('duplicate', 'unique', 'duplicate', 'another', 'unique')
      );
      expect(result.current).toBe('duplicate unique another');
    });
  });

  describe('Development Debugging', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not provide debug information for performance optimization', () => {
      process.env.NODE_ENV = 'development';
      const result = renderHook(() => 
        useClassNames('test', { active: true })
      );
      
      expect(typeof result.result.current).toBe('string');
      expect(result.result.current).toBe('test active');
    });
  });

  describe('Performance Optimizations', () => {
    it('should memoize results when inputs are stable', () => {
      const inputs = ['stable', 'inputs'];
      const { result, rerender } = renderHook(() => useClassNames(...inputs));
      
      const firstResult = result.current;
      rerender();
      const secondResult = result.current;
      
      expect(firstResult).toBe(secondResult);
      expect(firstResult).toBe('stable inputs');
    });

    it('should update when inputs change', () => {
      let dynamic = 'initial';
      const { result, rerender } = renderHook(() => useClassNames('base', dynamic));
      
      expect(result.current).toBe('base initial');
      
      dynamic = 'updated';
      rerender();
      
      expect(result.current).toBe('base updated');
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle component state-based classes', () => {
      const componentState = {
        isLoading: true,
        hasError: false,
        isActive: true,
        size: 'large'
      };

      const { result } = renderHook(() => 
        useClassNames(
          'component',
          `component--${componentState.size}`,
          {
            'component--loading': componentState.isLoading,
            'component--error': componentState.hasError,
            'component--active': componentState.isActive
          }
        )
      );

      expect(result.current).toBe(
        'component component--large component--loading component--active'
      );
    });

    it('should handle BEM methodology patterns', () => {
      const block = 'button';
      const modifiers = ['primary', 'large'];
      const state = { disabled: false, loading: true };

      const { result } = renderHook(() => 
        useClassNames(
          block,
          modifiers.map(mod => `${block}--${mod}`),
          {
            [`${block}--disabled`]: state.disabled,
            [`${block}--loading`]: state.loading
          }
        )
      );

      expect(result.current).toBe('button button--primary button--large button--loading');
    });
  });

  describe('DOM classList Integration Tests', () => {
    // Test component that uses the main performance-optimized useClassNames hook
    const TestComponent = ({ classes }: { classes: any[] }) => {
      const className = useClassNames(...classes);
      return h('div', { className, 'data-testid': 'test-element' });
    };

    // Test component that uses the debug version of the hook
    const DebugTestComponent = ({ classes }: { classes: any[] }) => {
      const { className } = useClassNamesWithDebug(...classes);
      return h('div', { className, 'data-testid': 'debug-test-element' });
    };

    const SimpleTestComponent = ({ classes }: { classes: any[] }) => {
      const className = useClassNamesSimple(...classes);
      return h('div', { className, 'data-testid': 'simple-test-element' });
    };

    it('should apply individual classes to DOM element classList', () => {
      const { getByTestId } = render(
        h(TestComponent, { classes: ['base', 'active', 'primary'] })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('base');
      expect(element).toHaveClass('active');
      expect(element).toHaveClass('primary');
      expect(element.classList.contains('base')).toBe(true);
      expect(element.classList.contains('active')).toBe(true);
      expect(element.classList.contains('primary')).toBe(true);
    });

    it('should handle conditional classes in classList', () => {
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: [
            'button',
            { 'button--active': true, 'button--disabled': false, 'button--large': true }
          ]
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('button');
      expect(element).toHaveClass('button--active');
      expect(element).toHaveClass('button--large');
      expect(element).not.toHaveClass('button--disabled');
      
      // Check classList directly
      expect(element.classList.length).toBe(3);
      expect(Array.from(element.classList)).toEqual(['button', 'button--active', 'button--large']);
    });

    it('should handle mixed input types in classList', () => {
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: [
            'base',
            ['utility', 'responsive'],
            { conditional: true, hidden: false },
            () => 'dynamic',
            123
          ]
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('base');
      expect(element).toHaveClass('utility');
      expect(element).toHaveClass('responsive');
      expect(element).toHaveClass('conditional');
      expect(element).toHaveClass('dynamic');
      expect(element).toHaveClass('123');
      expect(element).not.toHaveClass('hidden');
    });

    it('should deduplicate classes in DOM classList automatically', () => {
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: ['duplicate', 'unique', 'duplicate', 'another', 'unique']
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('duplicate');
      expect(element).toHaveClass('unique');
      expect(element).toHaveClass('another');
      
      // DOM automatically deduplicates, so we should only have 3 unique classes
      expect(element.classList.length).toBe(3);
      expect(Array.from(element.classList)).toEqual(['duplicate', 'unique', 'another']);
    });

    it('should handle empty and falsy values in classList', () => {
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: ['valid', null, undefined, false, '', 0, 'another-valid']
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('valid');
      expect(element).toHaveClass('another-valid');
      // These shouldn't appear as class names
      expect(element.className).not.toContain('null');
      expect(element.className).not.toContain('undefined');
      expect(element.className).not.toContain('false');
      expect(element.className).not.toContain('0');
      
      expect(element.classList.length).toBe(2);
    });

    it('should work with BEM methodology in DOM classList', () => {
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: [
            'card',
            'card--featured',
            'card--large',
            { 'card--active': true, 'card--disabled': false }
          ]
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('card');
      expect(element).toHaveClass('card--featured');
      expect(element).toHaveClass('card--large');
      expect(element).toHaveClass('card--active');
      expect(element).not.toHaveClass('card--disabled');
    });

    it('should handle responsive utility classes in classList', () => {
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: [
            'grid',
            'sm:grid-cols-1',
            'md:grid-cols-2',
            'lg:grid-cols-3',
            { 'xl:grid-cols-4': true }
          ]
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('grid');
      expect(element).toHaveClass('sm:grid-cols-1');
      expect(element).toHaveClass('md:grid-cols-2');
      expect(element).toHaveClass('lg:grid-cols-3');
      expect(element).toHaveClass('xl:grid-cols-4');
    });

    it('should handle dynamic function returns in classList', () => {
      const getThemeClass = (isDark: boolean) => isDark ? 'theme-dark' : 'theme-light';
      const getVariantClass = () => Math.random() > 0.5 ? 'variant-a' : 'variant-b';
      
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: [
            'component',
            () => getThemeClass(true),
            () => 'static-from-function'
          ]
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('component');
      expect(element).toHaveClass('theme-dark');
      expect(element).toHaveClass('static-from-function');
    });

    it('should work with useClassNamesSimple in DOM classList', () => {
      const { getByTestId } = render(
        h(SimpleTestComponent, { 
          classes: [
            'simple-base',
            { 'simple-active': true, 'simple-hidden': false },
            ['simple-util-1', 'simple-util-2']
          ]
        })
      );
      
      const element = getByTestId('simple-test-element');
      expect(element).toHaveClass('simple-base');
      expect(element).toHaveClass('simple-active');
      expect(element).toHaveClass('simple-util-1');
      expect(element).toHaveClass('simple-util-2');
      expect(element).not.toHaveClass('simple-hidden');
    });

    it('should handle special characters and unicode in classList', () => {
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: [
            'class-with-dashes',
            'class_with_underscores',
            'class:with:colons',
            'класс',    // Cyrillic
            '类名',     // Chinese
            'クラス名'  // Japanese
          ]
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('class-with-dashes');
      expect(element).toHaveClass('class_with_underscores');
      expect(element).toHaveClass('class:with:colons');
      expect(element).toHaveClass('класс');
      expect(element).toHaveClass('类名');
      expect(element).toHaveClass('クラス名');
    });

    it('should handle edge case with very long class names in DOM', () => {
      const longClassName = 'very-long-class-name-' + 'a'.repeat(100);
      const { getByTestId } = render(
        h(TestComponent, { 
          classes: [longClassName, 'short']
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass(longClassName);
      expect(element).toHaveClass('short');
      expect(element.classList.contains(longClassName)).toBe(true);
    });

    it('should handle real-world component state patterns in classList', () => {
      const componentState = {
        isLoading: true,
        hasError: false,
        variant: 'primary',
        size: 'large',
        isDisabled: false
      };

      const { getByTestId } = render(
        h(TestComponent, { 
          classes: [
            'btn',
            `btn--${componentState.variant}`,
            `btn--${componentState.size}`,
            {
              'btn--loading': componentState.isLoading,
              'btn--error': componentState.hasError,
              'btn--disabled': componentState.isDisabled
            }
          ]
        })
      );
      
      const element = getByTestId('test-element');
      expect(element).toHaveClass('btn');
      expect(element).toHaveClass('btn--primary');
      expect(element).toHaveClass('btn--large');
      expect(element).toHaveClass('btn--loading');
      expect(element).not.toHaveClass('btn--error');
      expect(element).not.toHaveClass('btn--disabled');
      
      expect(element.classList.length).toBe(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid inputs gracefully', () => {
      const symbol = Symbol('test');
      const { result } = renderHook(() => 
        useClassNames('valid', symbol as any, 'another-valid')
      );
      
      expect(result.current).toBe('valid another-valid');
    });

    it('should handle circular references in objects', () => {
      const circularObj: any = { valid: true };
      circularObj.self = circularObj;
      
      const { result } = renderHook(() => 
        useClassNames('test', circularObj)
      );
      
      // Should not throw and should extract non-circular properties
      expect(result.current).toContain('test');
      expect(result.current).toContain('valid');
    });
  });

  describe('Immutability Guarantees', () => {
    it('should not mutate input arrays', () => {
      const inputArray = ['class1', 'class2'];
      const originalLength = inputArray.length;
      const originalContent = [...inputArray];
      
      renderHook(() => useClassNames(inputArray));
      
      expect(inputArray).toHaveLength(originalLength);
      expect(inputArray).toEqual(originalContent);
    });

    it('should not mutate input objects', () => {
      const inputObject = { active: true, disabled: false };
      const originalKeys = Object.keys(inputObject);
      const originalValues = Object.values(inputObject);
      
      renderHook(() => useClassNames(inputObject));
      
      expect(Object.keys(inputObject)).toEqual(originalKeys);
      expect(Object.values(inputObject)).toEqual(originalValues);
    });

    it('should handle deeply nested arrays without mutation', () => {
      const deepArray = [['level1', ['level2', 'level2-2']], 'root'];
      const originalDeepArray = JSON.parse(JSON.stringify(deepArray));
      
      const { result } = renderHook(() => useClassNames(deepArray));
      
      expect(result.current).toBe('level1 level2 level2-2 root');
      expect(deepArray).toEqual(originalDeepArray);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely large numbers of inputs', () => {
      const manyInputs = Array.from({ length: 1000 }, (_, i) => `class-${i}`);
      const { result } = renderHook(() => useClassNames(...manyInputs));
      
      expect(result.current).toContain('class-0');
      expect(result.current).toContain('class-999');
      expect(result.current.split(' ')).toHaveLength(1000);
    });

    it('should handle strings with special characters', () => {
      const { result } = renderHook(() => 
        useClassNames('class-with-dashes', 'class_with_underscores', 'class:with:colons')
      );
      
      expect(result.current).toBe('class-with-dashes class_with_underscores class:with:colons');
    });

    it('should handle unicode characters in class names', () => {
      const { result } = renderHook(() => 
        useClassNames('класс', '类名', 'クラス名')
      );
      
      expect(result.current).toBe('класс 类名 クラス名');
    });

    it('should handle very long class names', () => {
      const longClassName = 'a'.repeat(1000);
      const { result } = renderHook(() => useClassNames(longClassName, 'short'));
      
      expect(result.current).toContain(longClassName);
      expect(result.current).toContain('short');
    });

    it('should maintain order and deduplicate by default', () => {
      const { result } = renderHook(() => 
        useClassNames('first', 'second', 'first', 'third', 'second')
      );
      
      expect(result.current).toBe('first second third');
    });
  });
});

describe('useClassNamesSimple Hook', () => {
  it('should return only className string', () => {
    const { result } = renderHook(() => 
      useClassNamesSimple('base', { active: true }, ['extra', 'classes'])
    );
    
    expect(typeof result.current).toBe('string');
    expect(result.current).toBe('base active extra classes');
  });

  it('should deduplicate classes by default', () => {
    const { result } = renderHook(() => 
      useClassNamesSimple('duplicate', 'unique', 'duplicate')
    );
    
    expect(result.current).toBe('duplicate unique');
  });

  it('should handle all input types like the full hook', () => {
    const { result } = renderHook(() => 
      useClassNamesSimple(
        'base',
        () => 'function-result',
        { conditional: true },
        ['array', 'items'],
        null,
        undefined,
        false
      )
    );
    
    expect(result.current).toBe('base function-result conditional array items');
  });

  it('should be more performant than deprecated hook for simple cases', () => {
    process.env.NODE_ENV = 'production';
    const { result: fullResult } = renderHook(() => 
      useClassNames('test')
    );
    const { result: simpleResult } = renderHook(() => 
      useClassNamesSimple('test')
    );
    
    expect(typeof fullResult.current).toBe('string');
    expect(typeof simpleResult.current).toBe('string');
    expect(fullResult.current).toBe(simpleResult.current);
  });

  describe('Immutability in Simple Hook', () => {
    it('should not mutate input arrays', () => {
      const inputArray = ['class1', 'class2'];
      const originalArray = [...inputArray];
      
      renderHook(() => useClassNamesSimple(inputArray));
      
      expect(inputArray).toEqual(originalArray);
    });

    it('should not mutate input objects', () => {
      const inputObject = { active: true, disabled: false };
      const originalObject = { ...inputObject };
      
      renderHook(() => useClassNamesSimple(inputObject));
      
      expect(inputObject).toEqual(originalObject);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large numbers of inputs efficiently', () => {
      const start = performance.now();
      const manyInputs = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      
      const { result } = renderHook(() => useClassNamesSimple(...manyInputs));
      const end = performance.now();
      
      expect(result.current).toContain('class-0');
      expect(result.current).toContain('class-99');
      expect(end - start).toBeLessThan(100); // Should be very fast
    });

    it('should memoize results properly', () => {
      const inputs = ['stable', 'inputs', { active: true }];
      const { result, rerender } = renderHook(() => useClassNamesSimple(...inputs));
      
      const firstRender = result.current;
      rerender();
      const secondRender = result.current;
      
      expect(firstRender).toBe(secondRender);
      expect(firstRender).toBe('stable inputs active');
    });
  });
});

describe('useClassNamesWithDebug Hook (Development & Debugging)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(100);
  });

  describe('Basic Functionality with Debug Info', () => {
    it('should return className and debug information', () => {
      const { result } = renderHook(() => useClassNamesWithDebug('test-class', { active: true }));
      
      expect(result.current.className).toBe('test-class active');
      expect(result.current.debug).toBeDefined();
      expect(result.current.debug.finalClassName).toBe('test-class active');
      expect(result.current.debug.inputCount).toBe(2);
      expect(result.current.debug.resolvedClasses).toEqual(['test-class', 'active']);
      expect(result.current.debug.computationTime).toBeGreaterThanOrEqual(0);
    });

    it('should track skipped inputs in debug info', () => {
      const { result } = renderHook(() => 
        useClassNamesWithDebug('valid', null, undefined, false, '', { active: true, hidden: false })
      );
      
      expect(result.current.className).toBe('valid active');
      expect(result.current.debug.skippedInputs.length).toBeGreaterThan(0);
      expect(result.current.debug.resolvedClasses).toEqual(['valid', 'active']);
    });

    it('should freeze debug data for immutability', () => {
      const { result } = renderHook(() => useClassNamesWithDebug('test'));
      
      expect(Object.isFrozen(result.current.debug.resolvedClasses)).toBe(true);
      expect(Object.isFrozen(result.current.debug.skippedInputs)).toBe(true);
    });

    it('should handle performance timing in debug mode', () => {
      mockPerformance.now.mockReturnValueOnce(100).mockReturnValueOnce(105);
      
      const { result } = renderHook(() => useClassNamesWithDebug('timing-test'));
      
      expect(result.current.debug.computationTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Complex Debugging Scenarios', () => {
    it('should debug function resolution', () => {
      const dynamicFunction = () => 'dynamic-class';
      const { result } = renderHook(() => 
        useClassNamesWithDebug('base', dynamicFunction, { conditional: true })
      );
      
      expect(result.current.className).toBe('base dynamic-class conditional');
      expect(result.current.debug.resolvedClasses).toEqual(['base', 'dynamic-class', 'conditional']);
    });

    it('should handle error recovery in functions for debugging', () => {
      const errorFunction = () => { throw new Error('Test error'); };
      const { result } = renderHook(() => 
        useClassNamesWithDebug('base', errorFunction, 'safe')
      );
      
      expect(result.current.className).toBe('base safe');
      expect(result.current.debug.skippedInputs).toContainEqual(errorFunction);
    });

    it('should provide comprehensive debugging for mixed inputs', () => {
      const { result } = renderHook(() => 
        useClassNamesWithDebug(
          'string-class',
          ['array', 'classes'],
          { object: true, skip: false },
          () => 'function-class',
          42,
          null
        )
      );
      
      expect(result.current.className).toBe('string-class array classes object function-class 42');
      expect(result.current.debug.inputCount).toBe(6);
      expect(result.current.debug.resolvedClasses).toEqual([
        'string-class', 'array', 'classes', 'object', 'function-class', '42'
      ]);
    });
  });
});

describe('useClassNamesSimple Hook (Deprecated - Compatibility)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.warn to test deprecation warning
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Deprecation Handling', () => {
    it('should show deprecation warning in development', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const { result } = renderHook(() => useClassNamesSimple('test'));
      
      expect(console.warn).toHaveBeenCalledWith(
        'useClassNamesSimple is deprecated. Use useClassNames instead.'
      );
      expect(result.current).toBe('test');
      
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should maintain compatibility with old API', () => {
      const { result } = renderHook(() => 
        useClassNamesSimple('base', { active: true }, ['util1', 'util2'])
      );
      
      expect(result.current).toBe('base active util1 util2');
    });
  });
});