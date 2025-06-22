import { setClassList, unsetClassList, toggleClassList } from '../hooks';

// Setup DOM testing environment
const createMockElement = (): Element => {
  const element = document.createElement('div');
  return element;
};

const createMockElements = (count: number): Element[] => {
  return Array.from({ length: count }, () => createMockElement());
};

describe('classList API', () => {
  describe('setClassList', () => {
    it('should add single class to single element', () => {
      const element = createMockElement();
      setClassList(element, 'test-class');
      
      expect(element.classList.contains('test-class')).toBe(true);
    });

    it('should add multiple classes to single element', () => {
      const element = createMockElement();
      setClassList(element, 'class1', 'class2', 'class3');
      
      expect(element.classList.contains('class1')).toBe(true);
      expect(element.classList.contains('class2')).toBe(true);
      expect(element.classList.contains('class3')).toBe(true);
    });

    it('should handle object-based conditionals', () => {
      const element = createMockElement();
      setClassList(element, 'base', {
        'active': true,
        'disabled': false,
        'loading': true
      });
      
      expect(element.classList.contains('base')).toBe(true);
      expect(element.classList.contains('active')).toBe(true);
      expect(element.classList.contains('loading')).toBe(true);
      expect(element.classList.contains('disabled')).toBe(false);
    });

    it('should handle array inputs', () => {
      const element = createMockElement();
      setClassList(element, ['class1', 'class2'], 'class3');
      
      expect(element.classList.contains('class1')).toBe(true);
      expect(element.classList.contains('class2')).toBe(true);
      expect(element.classList.contains('class3')).toBe(true);
    });

    it('should handle function inputs', () => {
      const element = createMockElement();
      const getClassName = () => 'dynamic-class';
      setClassList(element, 'base', getClassName);
      
      expect(element.classList.contains('base')).toBe(true);
      expect(element.classList.contains('dynamic-class')).toBe(true);
    });

    it('should handle mixed input types', () => {
      const element = createMockElement();
      setClassList(
        element,
        'base',
        ['utility', 'responsive'],
        { conditional: true, hidden: false },
        () => 'dynamic',
        123
      );
      
      expect(element.classList.contains('base')).toBe(true);
      expect(element.classList.contains('utility')).toBe(true);
      expect(element.classList.contains('responsive')).toBe(true);
      expect(element.classList.contains('conditional')).toBe(true);
      expect(element.classList.contains('dynamic')).toBe(true);
      expect(element.classList.contains('123')).toBe(true);
      expect(element.classList.contains('hidden')).toBe(false);
    });

    it('should filter out falsy values', () => {
      const element = createMockElement();
      setClassList(element, 'valid', null, undefined, false, '', 0, 'another-valid');
      
      expect(element.classList.contains('valid')).toBe(true);
      expect(element.classList.contains('another-valid')).toBe(true);
      expect(element.classList.length).toBe(2);
    });

    it('should deduplicate classes automatically', () => {
      const element = createMockElement();
      setClassList(element, 'duplicate', 'unique', 'duplicate', 'another');
      
      expect(element.classList.contains('duplicate')).toBe(true);
      expect(element.classList.contains('unique')).toBe(true);
      expect(element.classList.contains('another')).toBe(true);
      // DOM automatically deduplicates
      expect(element.classList.length).toBe(3);
    });

    it('should work with multiple elements (array)', () => {
      const elements = createMockElements(3);
      setClassList(elements, 'shared-class', 'another');
      
      elements.forEach(element => {
        expect(element.classList.contains('shared-class')).toBe(true);
        expect(element.classList.contains('another')).toBe(true);
      });
    });

    it('should work with NodeList', () => {
      // Create a container with elements
      const container = document.createElement('div');
      container.innerHTML = '<div class="item"></div><div class="item"></div>';
      const nodeList = container.querySelectorAll('.item');
      
      setClassList(nodeList, 'new-class');
      
      Array.from(nodeList).forEach(element => {
        expect(element.classList.contains('new-class')).toBe(true);
      });
    });

    it('should handle empty inputs gracefully', () => {
      const element = createMockElement();
      setClassList(element);
      
      expect(element.classList.length).toBe(0);
    });

    it('should handle null/undefined elements gracefully', () => {
      expect(() => setClassList(null as any, 'test')).not.toThrow();
      expect(() => setClassList(undefined as any, 'test')).not.toThrow();
    });

    it('should handle empty element collections gracefully', () => {
      expect(() => setClassList([], 'test')).not.toThrow();
      expect(() => setClassList(document.querySelectorAll('.non-existent'), 'test')).not.toThrow();
    });
  });

  describe('unsetClassList', () => {
    it('should remove single class from single element', () => {
      const element = createMockElement();
      element.classList.add('test-class', 'other-class');
      
      unsetClassList(element, 'test-class');
      
      expect(element.classList.contains('test-class')).toBe(false);
      expect(element.classList.contains('other-class')).toBe(true);
    });

    it('should remove multiple classes from single element', () => {
      const element = createMockElement();
      element.classList.add('class1', 'class2', 'class3', 'keep');
      
      unsetClassList(element, 'class1', 'class2');
      
      expect(element.classList.contains('class1')).toBe(false);
      expect(element.classList.contains('class2')).toBe(false);
      expect(element.classList.contains('class3')).toBe(true);
      expect(element.classList.contains('keep')).toBe(true);
    });

    it('should handle object-based conditionals for removal', () => {
      const element = createMockElement();
      element.classList.add('base', 'active', 'disabled', 'loading');
      
      unsetClassList(element, {
        'active': true,
        'disabled': false,
        'loading': true
      });
      
      expect(element.classList.contains('base')).toBe(true);
      expect(element.classList.contains('active')).toBe(false);
      expect(element.classList.contains('loading')).toBe(false);
      expect(element.classList.contains('disabled')).toBe(true); // wasn't removed (falsy condition)
    });

    it('should work with multiple elements', () => {
      const elements = createMockElements(3);
      elements.forEach(element => {
        element.classList.add('remove-me', 'keep-me');
      });
      
      unsetClassList(elements, 'remove-me');
      
      elements.forEach(element => {
        expect(element.classList.contains('remove-me')).toBe(false);
        expect(element.classList.contains('keep-me')).toBe(true);
      });
    });

    it('should handle removing non-existent classes gracefully', () => {
      const element = createMockElement();
      element.classList.add('existing');
      
      unsetClassList(element, 'non-existent', 'also-non-existent');
      
      expect(element.classList.contains('existing')).toBe(true);
      expect(element.classList.length).toBe(1);
    });
  });

  describe('toggleClassList', () => {
    it('should toggle single class on single element', () => {
      const element = createMockElement();
      
      // First toggle - should add
      toggleClassList(element, 'toggle-class');
      expect(element.classList.contains('toggle-class')).toBe(true);
      
      // Second toggle - should remove
      toggleClassList(element, 'toggle-class');
      expect(element.classList.contains('toggle-class')).toBe(false);
    });

    it('should toggle multiple classes', () => {
      const element = createMockElement();
      element.classList.add('class1'); // Pre-existing
      
      toggleClassList(element, 'class1', 'class2');
      
      expect(element.classList.contains('class1')).toBe(false); // Was toggled off
      expect(element.classList.contains('class2')).toBe(true);  // Was toggled on
    });

    it('should handle object-based conditionals for toggling', () => {
      const element = createMockElement();
      element.classList.add('active'); // Pre-existing
      
      toggleClassList(element, {
        'active': true,     // Will be toggled (currently exists, so will be removed)
        'disabled': false,  // Will be ignored (falsy condition)
        'loading': true     // Will be toggled (doesn't exist, so will be added)
      });
      
      expect(element.classList.contains('active')).toBe(false);  // Toggled off
      expect(element.classList.contains('loading')).toBe(true);  // Toggled on
      expect(element.classList.contains('disabled')).toBe(false); // Ignored
    });

    it('should work with multiple elements', () => {
      const elements = createMockElements(3);
      elements[0].classList.add('toggle-me'); // First element has class
      // Other elements don't have the class
      
      toggleClassList(elements, 'toggle-me');
      
      expect(elements[0].classList.contains('toggle-me')).toBe(false); // Toggled off
      expect(elements[1].classList.contains('toggle-me')).toBe(true);  // Toggled on
      expect(elements[2].classList.contains('toggle-me')).toBe(true);  // Toggled on
    });

    it('should handle mixed input types for toggling', () => {
      const element = createMockElement();
      element.classList.add('existing');
      
      toggleClassList(
        element,
        'existing',    // Will be toggled off
        'new-class',   // Will be toggled on
        ['array1', 'array2'], // Will be toggled on
        { conditional: true } // Will be toggled on
      );
      
      expect(element.classList.contains('existing')).toBe(false);
      expect(element.classList.contains('new-class')).toBe(true);
      expect(element.classList.contains('array1')).toBe(true);
      expect(element.classList.contains('array2')).toBe(true);
      expect(element.classList.contains('conditional')).toBe(true);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle function errors gracefully', () => {
      const element = createMockElement();
      const throwingFunction = () => {
        throw new Error('Test error');
      };
      
      expect(() => setClassList(element, 'safe', throwingFunction)).not.toThrow();
      expect(element.classList.contains('safe')).toBe(true);
    });

    it('should handle deeply nested arrays', () => {
      const element = createMockElement();
      setClassList(element, [['nested', 'array'], 'simple']);
      
      expect(element.classList.contains('nested')).toBe(true);
      expect(element.classList.contains('array')).toBe(true);
      expect(element.classList.contains('simple')).toBe(true);
    });

    it('should handle complex nested structures', () => {
      const element = createMockElement();
      setClassList(
        element,
        'base',
        [
          'array-item',
          { 'conditional': true, 'hidden': false },
          () => 'function-result'
        ],
        {
          'object-true': true,
          'object-false': false
        }
      );
      
      expect(element.classList.contains('base')).toBe(true);
      expect(element.classList.contains('array-item')).toBe(true);
      expect(element.classList.contains('conditional')).toBe(true);
      expect(element.classList.contains('function-result')).toBe(true);
      expect(element.classList.contains('object-true')).toBe(true);
      expect(element.classList.contains('hidden')).toBe(false);
      expect(element.classList.contains('object-false')).toBe(false);
    });

    it('should trim whitespace from string inputs', () => {
      const element = createMockElement();
      setClassList(element, '  spaced  ', 'normal');
      
      expect(element.classList.contains('spaced')).toBe(true);
      expect(element.classList.contains('normal')).toBe(true);
      expect(element.classList.length).toBe(2);
    });

    it('should handle number inputs', () => {
      const element = createMockElement();
      setClassList(element, 'class', 123, 'end');
      
      expect(element.classList.contains('class')).toBe(true);
      expect(element.classList.contains('123')).toBe(true);
      expect(element.classList.contains('end')).toBe(true);
    });
  });

  describe('Performance characteristics', () => {
    it('should handle large numbers of elements efficiently', () => {
      const elements = createMockElements(1000);
      const startTime = performance.now();
      
      setClassList(elements, 'performance-test', { 'active': true });
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      
      elements.forEach(element => {
        expect(element.classList.contains('performance-test')).toBe(true);
        expect(element.classList.contains('active')).toBe(true);
      });
    });

    it('should handle large numbers of classes efficiently', () => {
      const element = createMockElement();
      const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      
      const startTime = performance.now();
      setClassList(element, ...manyClasses);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
      expect(element.classList.length).toBe(100);
    });
  });
});