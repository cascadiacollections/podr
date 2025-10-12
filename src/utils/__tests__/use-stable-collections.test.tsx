/**
 * Comprehensive tests for signals-first stable collections utility
 * 
 * @module use-stable-collections.test
 */

import { signal } from '@preact/signals';
import { render } from '@testing-library/preact';
import { FunctionComponent, h } from 'preact';
import { useState } from 'preact/hooks';
import {
  filter,
  groupBy,
  map,
  reduce,
  sort,
  unique,
  useCollection,
  useCombine,
  useComputed,
  useConditional,
  usePagination,
  useTransform
} from '../use-stable-collections';

describe('use-stable-collections', () => {
  describe('useCollection', () => {
    it('should return stable signal for arrays', () => {
      let collectionSignal: any;

      const TestComponent: FunctionComponent = () => {
        const [items] = useState<number[]>([1, 2, 3]);
        collectionSignal = useCollection(items);

        return <div data-testid="count">{collectionSignal.value.length}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('count')).toHaveTextContent('3');
      expect(collectionSignal.value).toEqual([1, 2, 3]);
    });

    it('should handle empty arrays with singleton reference', () => {
      let emptySignal1: any;
      let emptySignal2: any;

      const TestComponent: FunctionComponent = () => {
        emptySignal1 = useCollection([]);
        emptySignal2 = useCollection([]);

        return <div data-testid="same">{String(emptySignal1.value === emptySignal2.value)}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('same')).toHaveTextContent('true');
    });

    it('should handle Sets', () => {
      const TestComponent: FunctionComponent = () => {
        const emptySet = useCollection(new Set<number>());
        const filledSet = useCollection(new Set([1, 2, 3]));

        return (
          <div>
            <div data-testid="empty-size">{emptySet.value.size}</div>
            <div data-testid="filled-size">{filledSet.value.size}</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('empty-size')).toHaveTextContent('0');
      expect(getByTestId('filled-size')).toHaveTextContent('3');
    });

    it('should handle Maps', () => {
      const TestComponent: FunctionComponent = () => {
        const emptyMap = useCollection(new Map<string, number>());
        const filledMap = useCollection(new Map([['a', 1], ['b', 2]]));

        return (
          <div>
            <div data-testid="empty-size">{emptyMap.value.size}</div>
            <div data-testid="filled-size">{filledMap.value.size}</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('empty-size')).toHaveTextContent('0');
      expect(getByTestId('filled-size')).toHaveTextContent('2');
    });
  });

  describe('useTransform', () => {
    it('should filter items', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5, 2, 3];
        const transformer = useTransform(items);
        const filtered = transformer.filter(n => n > 2);

        return <div data-testid="filtered">{filtered.value.length}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('filtered')).toHaveTextContent('4'); // [3, 4, 5, 3]
    });

    it('should map items', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const mapped = transformer.map(n => n * 2);

        return <div data-testid="mapped">{mapped.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('mapped')).toHaveTextContent('2,4,6,8,10');
    });

    it('should get unique items', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const uniqueItems = transformer.unique();

        return <div data-testid="unique">{uniqueItems.value.length}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('unique')).toHaveTextContent('5'); // [1, 2, 3, 4, 5]
    });

    it('should sort items', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [5, 2, 4, 1, 3];
        const transformer = useTransform(items);
        const sorted = transformer.sort((a, b) => b - a);

        return <div data-testid="sorted">{sorted.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('sorted')).toHaveTextContent('5,4,3,2,1');
    });

    it('should slice items', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const sliced = transformer.slice(1, 4);

        return <div data-testid="sliced">{sliced.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('sliced')).toHaveTextContent('2,3,4');
    });

    it('should take first n items', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const taken = transformer.take(3);

        return <div data-testid="taken">{taken.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('taken')).toHaveTextContent('1,2,3');
    });

    it('should drop first n items', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const dropped = transformer.drop(2);

        return <div data-testid="dropped">{dropped.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('dropped')).toHaveTextContent('3,4,5');
    });

    it('should handle groupBy transformation', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [
          { category: 'A', value: 1 },
          { category: 'B', value: 2 },
          { category: 'A', value: 3 }
        ];
        const transformer = useTransform(items);
        const grouped = transformer.groupBy(item => item.category);

        return (
          <div>
            <div data-testid="groups">{grouped.value.size}</div>
            <div data-testid="group-a">{grouped.value.get('A')?.length ?? 0}</div>
            <div data-testid="group-b">{grouped.value.get('B')?.length ?? 0}</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('groups')).toHaveTextContent('2');
      expect(getByTestId('group-a')).toHaveTextContent('2');
      expect(getByTestId('group-b')).toHaveTextContent('1');
    });

    it('should handle reduce transformation', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const sum = transformer.reduce((acc, item) => acc + item, 0);

        return <div data-testid="sum">{sum.value}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('sum')).toHaveTextContent('15');
    });

    it('should handle find operation', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const found = transformer.find(n => n > 3);

        return <div data-testid="found">{found.value ?? 'none'}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('found')).toHaveTextContent('4');
    });

    it('should handle some operation', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const hasEven = transformer.some(n => n % 2 === 0);

        return <div data-testid="has-even">{String(hasEven.value)}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('has-even')).toHaveTextContent('true');
    });

    it('should handle every operation', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const allPositive = transformer.every(n => n > 0);

        return <div data-testid="all-positive">{String(allPositive.value)}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('all-positive')).toHaveTextContent('true');
    });

    it('should convert to Set', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 2, 3, 3, 3];
        const transformer = useTransform(items);
        const itemSet = transformer.toSet();

        return <div data-testid="set-size">{itemSet.value.size}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('set-size')).toHaveTextContent('3');
    });

    it('should handle pipe transformation', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const result = transformer.pipe(arr => arr.reduce((sum, n) => sum + n, 0));

        return <div data-testid="result">{result.value}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('result')).toHaveTextContent('15');
    });

    it('should get collection length', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);
        const length = transformer.length();

        return <div data-testid="length">{length.value}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('length')).toHaveTextContent('5');
    });

    it('should check if empty', () => {
      const TestComponent: FunctionComponent = () => {
        const items: number[] = [];
        const transformer = useTransform(items);
        const empty = transformer.isEmpty();

        return <div data-testid="empty">{String(empty.value)}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('empty')).toHaveTextContent('true');
    });

    it('should return empty singleton for empty input', () => {
      const TestComponent: FunctionComponent = () => {
        const items: number[] = [];
        const transformer = useTransform(items);
        const filtered = transformer.filter(() => true);

        return <div data-testid="is-empty">{String(filtered.value.length === 0)}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('is-empty')).toHaveTextContent('true');
    });
  });

  describe('useComputed', () => {
    it('should create computed collection from dependencies', () => {
      const TestComponent: FunctionComponent = () => {
        const [multiplier] = useState(2);
        const items = [1, 2, 3];

        const computed = useComputed(
          (mult: number, arr: number[]) => arr.map(x => x * mult),
          [multiplier, items]
        );

        return <div data-testid="computed">{computed.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('computed')).toHaveTextContent('2,4,6');
    });

    it('should return empty array on computation error', () => {
      const TestComponent: FunctionComponent = () => {
        const computed = useComputed(
          () => {
            throw new Error('Test error');
          },
          []
        );

        return <div data-testid="empty">{String(computed.value.length === 0)}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('empty')).toHaveTextContent('true');
    });
  });

  describe('useCombine', () => {
    it('should combine multiple arrays', () => {
      const TestComponent: FunctionComponent = () => {
        const items1 = [1, 2];
        const items2 = [3, 4];
        const items3 = signal([5, 6]);

        const combined = useCombine(items1, items2, items3);

        return <div data-testid="combined">{combined.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('combined')).toHaveTextContent('1,2,3,4,5,6');
    });

    it('should skip empty arrays', () => {
      const TestComponent: FunctionComponent = () => {
        const items1 = [1, 2];
        const items2: number[] = [];
        const items3 = [3, 4];

        const combined = useCombine(items1, items2, items3);

        return <div data-testid="combined">{combined.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('combined')).toHaveTextContent('1,2,3,4');
    });

    it('should return empty singleton when all sources are empty', () => {
      const TestComponent: FunctionComponent = () => {
        const items1: number[] = [];
        const items2: number[] = [];

        const combined = useCombine(items1, items2);

        return <div data-testid="empty">{String(combined.value.length === 0)}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('empty')).toHaveTextContent('true');
    });
  });

  describe('useConditional', () => {
    it('should return truthy value when condition is true', () => {
      const TestComponent: FunctionComponent = () => {
        const [condition] = useState(true);
        const truthyItems = [1, 2, 3];
        const falsyItems = [4, 5, 6];

        const conditional = useConditional(condition, truthyItems, falsyItems);

        return <div data-testid="conditional">{conditional.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('conditional')).toHaveTextContent('1,2,3');
    });

    it('should return falsy value when condition is false', () => {
      const TestComponent: FunctionComponent = () => {
        const [condition] = useState(false);
        const truthyItems = [1, 2, 3];
        const falsyItems = [4, 5, 6];

        const conditional = useConditional(condition, truthyItems, falsyItems);

        return <div data-testid="conditional">{conditional.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('conditional')).toHaveTextContent('4,5,6');
    });

    it('should work with signal conditions', () => {
      const TestComponent: FunctionComponent = () => {
        const condition = signal(true);
        const truthyItems = [1, 2, 3];
        const falsyItems = [4, 5, 6];

        const conditional = useConditional(condition, truthyItems, falsyItems);

        return <div data-testid="conditional">{conditional.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('conditional')).toHaveTextContent('1,2,3');
    });
  });

  describe('usePagination', () => {
    it('should paginate collections correctly', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const pagination = usePagination(items, 3);

        return (
          <div>
            <div data-testid="page-items">{pagination.paginationData.value.items.join(',')}</div>
            <div data-testid="total-pages">{pagination.paginationData.value.totalPages}</div>
            <div data-testid="current-page">{pagination.paginationData.value.currentPage}</div>
            <div data-testid="has-next">{String(pagination.paginationData.value.hasNextPage)}</div>
            <div data-testid="has-prev">{String(pagination.paginationData.value.hasPreviousPage)}</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('page-items')).toHaveTextContent('1,2,3');
      expect(getByTestId('total-pages')).toHaveTextContent('4');
      expect(getByTestId('current-page')).toHaveTextContent('0');
      expect(getByTestId('has-next')).toHaveTextContent('true');
      expect(getByTestId('has-prev')).toHaveTextContent('false');
    });

    it('should handle empty collections', () => {
      const TestComponent: FunctionComponent = () => {
        const items: number[] = [];
        const pagination = usePagination(items, 3);

        return (
          <div>
            <div data-testid="page-items">{pagination.paginationData.value.items.length}</div>
            <div data-testid="total-pages">{pagination.paginationData.value.totalPages}</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('page-items')).toHaveTextContent('0');
      expect(getByTestId('total-pages')).toHaveTextContent('0');
    });
  });

  describe('standalone transform functions', () => {
    it('should filter with standalone function', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [3, 1, 4, 1, 5];
        const filtered = filter(items, x => x > 2);

        return <div data-testid="filtered">{filtered.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('filtered')).toHaveTextContent('3,4,5');
    });

    it('should map with standalone function', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [3, 1, 4, 1, 5];
        const mapped = map(items, x => x * 2);

        return <div data-testid="mapped">{mapped.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('mapped')).toHaveTextContent('6,2,8,2,10');
    });

    it('should sort with standalone function', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [3, 1, 4, 1, 5];
        const sorted = sort(items, (a, b) => a - b);

        return <div data-testid="sorted">{sorted.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('sorted')).toHaveTextContent('1,1,3,4,5');
    });

    it('should get unique items with standalone function', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [3, 1, 4, 1, 5];
        const uniqueItems = unique(items);

        return <div data-testid="unique">{uniqueItems.value.join(',')}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('unique')).toHaveTextContent('3,1,4,5');
    });

    it('should group by with standalone function', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [
          { type: 'A', value: 1 },
          { type: 'B', value: 2 },
          { type: 'A', value: 3 }
        ];
        const grouped = groupBy(items, item => item.type);

        return (
          <div>
            <div data-testid="groups">{grouped.value.size}</div>
            <div data-testid="group-a">{grouped.value.get('A')?.length ?? 0}</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('groups')).toHaveTextContent('2');
      expect(getByTestId('group-a')).toHaveTextContent('2');
    });

    it('should reduce with standalone function', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const sum = reduce(items, (acc, item) => acc + item, 0);

        return <div data-testid="sum">{sum.value}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('sum')).toHaveTextContent('15');
    });
  });
});
