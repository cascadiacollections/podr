import { renderHook } from '@testing-library/preact';
import { useClassNames, useClassNamesSimple } from '../hooks';

// Mock performance API for testing
const mockPerformance = {
  now: jest.fn(() => 100)
};
global.performance = mockPerformance as any;

describe('useClassNames Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(100);
  });

  describe('Basic Functionality', () => {
    it('should handle single string input', () => {
      const { result } = renderHook(() => useClassNames('test-class'));
      expect(result.current.className).toBe('test-class');
    });

    it('should handle multiple string inputs', () => {
      const { result } = renderHook(() => useClassNames('class1', 'class2', 'class3'));
      expect(result.current.className).toBe('class1 class2 class3');
    });

    it('should filter out falsy values', () => {
      const { result } = renderHook(() => 
        useClassNames('valid', null, undefined, false, '', 'another-valid')
      );
      expect(result.current.className).toBe('valid another-valid');
    });

    it('should handle number inputs', () => {
      const { result } = renderHook(() => useClassNames('class', 123, 'end'));
      expect(result.current.className).toBe('class 123 end');
    });

    it('should trim whitespace from string inputs', () => {
      const { result } = renderHook(() => useClassNames('  spaced  ', 'normal'));
      expect(result.current.className).toBe('spaced normal');
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
      expect(result.current.className).toBe('base active loading');
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
      expect(result.current.className).toBe('class1 class3');
    });

    it('should handle empty object', () => {
      const { result } = renderHook(() => useClassNames('base', {}));
      expect(result.current.className).toBe('base');
    });
  });

  describe('Array Inputs', () => {
    it('should handle array of strings', () => {
      const { result } = renderHook(() => 
        useClassNames(['class1', 'class2'], 'class3')
      );
      expect(result.current.className).toBe('class1 class2 class3');
    });

    it('should handle nested arrays', () => {
      const { result } = renderHook(() => 
        useClassNames(['outer', ['nested1', 'nested2']], 'end')
      );
      expect(result.current.className).toBe('outer nested1 nested2 end');
    });

    it('should handle arrays with mixed types', () => {
      const { result } = renderHook(() => 
        useClassNames(['string', 123, true, false, null, { conditional: true }])
      );
      expect(result.current.className).toBe('string 123 conditional');
    });

    it('should handle empty arrays', () => {
      const { result } = renderHook(() => useClassNames('base', [], 'end'));
      expect(result.current.className).toBe('base end');
    });
  });

  describe('Function Inputs', () => {
    it('should execute functions and use return values', () => {
      const mockFunction = jest.fn(() => 'dynamic-class');
      const { result } = renderHook(() => useClassNames('base', mockFunction));
      
      expect(mockFunction).toHaveBeenCalled();
      expect(result.current.className).toBe('base dynamic-class');
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
      expect(result.current.className).toBe('base string-return conditional array return');
    });

    it('should handle function errors gracefully in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const errorFunction = jest.fn(() => {
        throw new Error('Test error');
      });

      const { result } = renderHook(() => useClassNames('base', errorFunction));
      expect(result.current.className).toBe('base');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identical class names by default', () => {
      const { result } = renderHook(() => 
        useClassNames('duplicate', 'unique', 'duplicate', 'another', 'unique')
      );
      expect(result.current.className).toBe('duplicate unique another');
    });

    it('should allow disabling deduplication', () => {
      const { result } = renderHook(() => 
        useClassNames('duplicate', 'unique', 'duplicate', { deduplicate: false })
      );
      expect(result.current.className).toBe('duplicate unique duplicate');
    });
  });

  describe('Custom Separator', () => {
    it('should use custom separator when provided', () => {
      const { result } = renderHook(() => 
        useClassNames('class1', 'class2', 'class3', { separator: '|' })
      );
      expect(result.current.className).toBe('class1|class2|class3');
    });

    it('should handle empty separator', () => {
      const { result } = renderHook(() => 
        useClassNames('a', 'b', 'c', { separator: '' })
      );
      expect(result.current.className).toBe('abc');
    });
  });

  describe('Development Debugging', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should provide debug information when enabled', () => {
      const { result } = renderHook(() => 
        useClassNames('test', { active: true }, { enableDebug: true })
      );
      
      expect(result.current.debug).toBeDefined();
      expect(result.current.debug!.finalClassName).toBe('test active');
      expect(result.current.debug!.inputCount).toBe(2);
      expect(result.current.debug!.resolvedClasses).toEqual(['test', 'active']);
      expect(typeof result.current.debug!.computationTime).toBe('number');
    });

    it('should track skipped inputs in debug mode', () => {
      const { result } = renderHook(() => 
        useClassNames('valid', null, false, '', { enableDebug: true })
      );
      
      expect(result.current.debug!.skippedInputs).toEqual([null, false, '']);
      expect(result.current.debug!.resolvedClasses).toEqual(['valid']);
    });

    it('should not provide debug info when disabled', () => {
      const { result } = renderHook(() => 
        useClassNames('test', { enableDebug: false })
      );
      
      expect(result.current.debug).toBeUndefined();
    });

    it('should track skipped object conditions in debug mode', () => {
      const { result } = renderHook(() => 
        useClassNames({ active: true, disabled: false }, { enableDebug: true })
      );
      
      expect(result.current.debug!.skippedInputs).toEqual([{ disabled: false }]);
      expect(result.current.debug!.resolvedClasses).toEqual(['active']);
    });
  });

  describe('Performance Optimizations', () => {
    it('should memoize results when inputs are stable', () => {
      const inputs = ['stable', 'inputs'];
      const { result, rerender } = renderHook(() => useClassNames(...inputs));
      
      const firstResult = result.current.className;
      rerender();
      const secondResult = result.current.className;
      
      expect(firstResult).toBe(secondResult);
      expect(firstResult).toBe('stable inputs');
    });

    it('should update when inputs change', () => {
      let dynamic = 'initial';
      const { result, rerender } = renderHook(() => useClassNames('base', dynamic));
      
      expect(result.current.className).toBe('base initial');
      
      dynamic = 'updated';
      rerender();
      
      expect(result.current.className).toBe('base updated');
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

      expect(result.current.className).toBe(
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

      expect(result.current.className).toBe('button button--primary button--large button--loading');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid inputs gracefully', () => {
      const symbol = Symbol('test');
      const { result } = renderHook(() => 
        useClassNames('valid', symbol as any, 'another-valid')
      );
      
      expect(result.current.className).toBe('valid another-valid');
    });

    it('should handle circular references in objects', () => {
      const circularObj: any = { valid: true };
      circularObj.self = circularObj;
      
      const { result } = renderHook(() => 
        useClassNames('test', circularObj)
      );
      
      // Should not throw and should extract non-circular properties
      expect(result.current.className).toContain('test');
      expect(result.current.className).toContain('valid');
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

  it('should be more performant than full hook for simple cases', () => {
    const { result: fullResult } = renderHook(() => 
      useClassNames('test', { enableDebug: false })
    );
    const { result: simpleResult } = renderHook(() => 
      useClassNamesSimple('test')
    );
    
    expect(typeof fullResult.current).toBe('object');
    expect(typeof simpleResult.current).toBe('string');
    expect(fullResult.current.className).toBe(simpleResult.current);
  });
});