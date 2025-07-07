import { signal } from '@preact/signals';
import { render } from '@testing-library/preact';
import { FunctionComponent, h } from 'preact';
import { useState } from 'preact/hooks';
import {
    filter,
    map,
    sort,
    unique,
    useCollection,
    useCombine,
    useComputed,
    useConditional,
    usePagination,
    useTransform
} from '../use-stable-collections';

describe('Enhanced Stable Collections', () => {
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
    it('should provide transformations for arrays', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5, 2, 3];
        const transformer = useTransform(items);

        const filtered = transformer.filter(n => n > 2);
        const mapped = transformer.map(n => n * 2);
        const uniqueItems = transformer.unique();
        const sorted = transformer.sort((a, b) => b - a);
        const sliced = transformer.slice(1, 4);
        const taken = transformer.take(3);

        return (
          <div>
            <div data-testid="filtered">{filtered.value.length}</div>
            <div data-testid="mapped">{mapped.value.join(',')}</div>
            <div data-testid="unique">{uniqueItems.value.length}</div>
            <div data-testid="sorted">{sorted.value.join(',')}</div>
            <div data-testid="sliced">{sliced.value.join(',')}</div>
            <div data-testid="taken">{taken.value.join(',')}</div>
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
            <div data-testid="group-a">{grouped.value.get('A')?.length || 0}</div>
            <div data-testid="group-b">{grouped.value.get('B')?.length || 0}</div>
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

    it('should handle find, some, and every operations', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [1, 2, 3, 4, 5];
        const transformer = useTransform(items);

        const found = transformer.find(n => n > 3);
        const hasEven = transformer.some(n => n % 2 === 0);
        const allPositive = transformer.every(n => n > 0);

        return (
          <div>
            <div data-testid="found">{found.value || 'none'}</div>
            <div data-testid="has-even">{String(hasEven.value)}</div>
            <div data-testid="all-positive">{String(allPositive.value)}</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('found')).toHaveTextContent('4');
      expect(getByTestId('has-even')).toHaveTextContent('true');
      expect(getByTestId('all-positive')).toHaveTextContent('true');
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
  });

  describe('useConditional', () => {
    it('should return different collections based on condition', () => {
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
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('page-items')).toHaveTextContent('1,2,3');
      expect(getByTestId('total-pages')).toHaveTextContent('4');
      expect(getByTestId('current-page')).toHaveTextContent('0');
      expect(getByTestId('has-next')).toHaveTextContent('true');
    });
  });

  describe('standalone transform functions', () => {
    it('should work as standalone functions', () => {
      const TestComponent: FunctionComponent = () => {
        const items = [3, 1, 4, 1, 5];

        const filtered = filter(items, x => x > 2);
        const mapped = map(items, x => x * 2);
        const sorted = sort(items, (a, b) => a - b);
        const uniqueItems = unique(items);

        return (
          <div>
            <div data-testid="filtered">{filtered.value.join(',')}</div>
            <div data-testid="mapped">{mapped.value.join(',')}</div>
            <div data-testid="sorted">{sorted.value.join(',')}</div>
            <div data-testid="unique">{uniqueItems.value.join(',')}</div>
          </div>
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('filtered')).toHaveTextContent('3,4,5');
      expect(getByTestId('mapped')).toHaveTextContent('6,2,8,2,10');
      expect(getByTestId('sorted')).toHaveTextContent('1,1,3,4,5');
      expect(getByTestId('unique')).toHaveTextContent('3,1,4,5');
    });
  });
});
