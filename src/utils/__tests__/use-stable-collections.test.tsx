import { render, act } from '@testing-library/preact';
import { signal, computed } from '@preact/signals';
import { FunctionComponent, h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  useStable,
  useStableSignal,
  useTransform,
  useComputedCollection,
  useCombinedCollections,
  useStableCollectionState,
  shallowEqual
} from '../use-stable-collections';

describe('Enhanced Stable Collections', () => {
  describe('useStable', () => {
    it('should return stable reference for empty arrays', () => {
      let stableRef1: readonly number[];
      let stableRef2: readonly number[];
      
      const TestComponent: FunctionComponent = () => {
        const [renderCount, setRenderCount] = useState(0);
        
        stableRef1 = useStable([]);
        stableRef2 = useStable([]);
        
        useEffect(() => {
          if (renderCount === 0) {
            setRenderCount(1);
          }
        }, [renderCount]);
        
        return <div data-testid="count">{renderCount}</div>;
      };
      
      render(<TestComponent />);
      
      // Both empty arrays should get the same stable reference
      expect(stableRef1).toBe(stableRef2);
    });

    it('should handle Sets', () => {
      const TestComponent: FunctionComponent = () => {
        const emptySet = useStable(new Set<number>());
        const filledSet = useStable(new Set([1, 2, 3]));
        
        return (
          <div>
            <div data-testid="empty-size">{emptySet.size}</div>
            <div data-testid="filled-size">{filledSet.size}</div>
          </div>
        );
      };
      
      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('empty-size')).toHaveTextContent('0');
      expect(getByTestId('filled-size')).toHaveTextContent('3');
    });

    it('should handle Maps', () => {
      const TestComponent: FunctionComponent = () => {
        const emptyMap = useStable(new Map<string, number>());
        const filledMap = useStable(new Map([['a', 1], ['b', 2]]));
        
        return (
          <div>
            <div data-testid="empty-size">{emptyMap.size}</div>
            <div data-testid="filled-size">{filledMap.size}</div>
          </div>
        );
      };
      
      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('empty-size')).toHaveTextContent('0');
      expect(getByTestId('filled-size')).toHaveTextContent('2');
    });
  });

  describe('useStableSignal', () => {
    it('should create reactive signal from collection', () => {
      let itemsSignal: any;
      
      const TestComponent: FunctionComponent = () => {
        const [items, setItems] = useState<number[]>([1, 2, 3]);
        
        itemsSignal = useStableSignal(items);
        
        useEffect(() => {
          setItems([1, 2, 3, 4, 5]);
        }, []);
        
        return <div data-testid="count">{itemsSignal.value.length}</div>;
      };
      
      const { getByTestId } = render(<TestComponent />);
      
      // Initial count should be 3
      expect(getByTestId('count')).toHaveTextContent('3');
      expect(itemsSignal).toBeDefined();
    });

    it('should maintain stable empty references in signals', () => {
      let emptySignal1: any;
      let emptySignal2: any;
      
      const TestComponent: FunctionComponent = () => {
        emptySignal1 = useStableSignal([]);
        emptySignal2 = useStableSignal([]);
        
        return <div data-testid="same">{String(emptySignal1.value === emptySignal2.value)}</div>;
      };
      
      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('same')).toHaveTextContent('true');
    });
  });

  describe('useTransform', () => {
    it('should provide chainable array transformations', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5, 2, 3];
        const transformer = useTransform(items);
        
        const filtered = transformer.filter(n => n > 2);
        const mapped = transformer.map(n => n * 2);
        const unique = transformer.unique();
        const sorted = transformer.sort((a, b) => b - a);
        const sliced = transformer.slice(1, 4);
        const taken = transformer.take(3);
        
        return (
          <div>
            <div data-testid="filtered">{filtered.length}</div>
            <div data-testid="mapped">{mapped.join(',')}</div>
            <div data-testid="unique">{unique.length}</div>
            <div data-testid="sorted">{sorted.join(',')}</div>
            <div data-testid="sliced">{sliced.join(',')}</div>
            <div data-testid="taken">{taken.join(',')}</div>
          </div>
        );
      };
      
      const { getByTestId } = render(<TestComponent />);
      
      expect(getByTestId('filtered')).toHaveTextContent('4'); // [3, 4, 5, 3]
      expect(getByTestId('mapped')).toHaveTextContent('2,4,6,8,10,4,6');
      expect(getByTestId('unique')).toHaveTextContent('5'); // [1, 2, 3, 4, 5]
      expect(getByTestId('sorted')).toHaveTextContent('5,4,3,3,2,2,1');
      expect(getByTestId('sliced')).toHaveTextContent('2,3,4');
      expect(getByTestId('taken')).toHaveTextContent('1,2,3');
    });
  });

  describe('shallowEqual', () => {
    it('should correctly compare arrays', () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(shallowEqual([], [])).toBe(true);
      expect(shallowEqual([1], [])).toBe(false);
    });

    it('should correctly compare Sets', () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 3]);
      const set3 = new Set([1, 2, 4]);
      
      expect(shallowEqual(set1, set2)).toBe(true);
      expect(shallowEqual(set1, set3)).toBe(false);
      expect(shallowEqual(new Set(), new Set())).toBe(true);
    });

    it('should correctly compare Maps', () => {
      const map1 = new Map([['a', 1], ['b', 2]]);
      const map2 = new Map([['a', 1], ['b', 2]]);
      const map3 = new Map([['a', 1], ['b', 3]]);
      
      expect(shallowEqual(map1, map2)).toBe(true);
      expect(shallowEqual(map1, map3)).toBe(false);
      expect(shallowEqual(new Map(), new Map())).toBe(true);
    });
  });
});
