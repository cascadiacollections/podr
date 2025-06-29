import { signal } from '@preact/signals';
import { act, render, screen } from '@testing-library/preact';
import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import {
  createCollectionContext,
  useCollection,
  useCollectionWithSignal,
  useCollectionWithSync,
  type UseCollectionOptions,
  type UseCollectionReturn
} from '../preact-collection';

// Test data types
interface TestItem {
  id: number;
  name: string;
  active: boolean;
  category: 'A' | 'B' | 'C';
}

interface SimpleItem {
  value: number;
}

// Test utilities
function createTestItem(id: number, name: string = `Item ${id}`, active: boolean = true, category: 'A' | 'B' | 'C' = 'A'): TestItem {
  return { id, name, active, category };
}

function createSimpleItem(value: number): SimpleItem {
  return { value };
}

// Hook testing utility components
interface TestItemComponentProps {
  initialItems?: readonly TestItem[];
  options?: UseCollectionOptions<TestItem>;
  onCollectionChange?: (collection: UseCollectionReturn<TestItem>) => void;
}

function TestItemComponent({ initialItems, options, onCollectionChange }: TestItemComponentProps) {
  const collection = useCollection(initialItems, options);

  useEffect(() => {
    onCollectionChange?.(collection);
  }, [collection, onCollectionChange]);

  return h('div', { 'data-testid': 'test-component' }, null);
}

interface SimpleItemComponentProps {
  initialItems?: readonly SimpleItem[];
  options?: UseCollectionOptions<SimpleItem>;
  onCollectionChange?: (collection: UseCollectionReturn<SimpleItem>) => void;
}

function SimpleItemComponent({ initialItems, options, onCollectionChange }: SimpleItemComponentProps) {
  const collection = useCollection(initialItems, options);

  useEffect(() => {
    onCollectionChange?.(collection);
  }, [collection, onCollectionChange]);

  return h('div', { 'data-testid': 'test-component' }, null);
}

// Mock functions for testing
const mockOnBeforeChange = jest.fn();
const mockOnAfterChange = jest.fn();
const mockOnSync = jest.fn();

describe('useCollection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Properties', () => {
    it('should initialize with empty collection by default', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        onCollectionChange: (c: UseCollectionReturn<TestItem>) => { collection = c; }
      }));

      expect(collection!.items).toEqual([]);
      expect(collection!.size).toBe(0);
      expect(collection!.isEmpty).toBe(true);
    });

    it('should initialize with provided items', () => {
      const initialItems = [createTestItem(1), createTestItem(2)];
      let collection: UseCollectionReturn<TestItem>;

      render(h(TestItemComponent, {
        initialItems,
        onCollectionChange: (c: UseCollectionReturn<TestItem>) => { collection = c; }
      }));

      expect(collection!.items).toHaveLength(2);
      expect(collection!.size).toBe(2);
      expect(collection!.isEmpty).toBe(false);
      expect(collection!.items[0]).toEqual(initialItems[0]);
      expect(collection!.items[1]).toEqual(initialItems[1]);
    });

    it('should maintain immutable items reference', () => {
      let collection: UseCollectionReturn<TestItem>;
      const initialItems = [createTestItem(1)];

      render(h(TestItemComponent, {
        initialItems,
        onCollectionChange: (c: UseCollectionReturn<TestItem>) => { collection = c; }
      }));

      const firstReference = collection!.items;

      // Force re-render
      act(() => {
        collection!.add(createTestItem(2));
      });

      // Items reference should change after mutation
      expect(collection!.items).not.toBe(firstReference);
      // But the immutable collection should be frozen
      expect(Object.isFrozen(collection!.items)).toBe(true);
    });
  });

  describe('Add Operations', () => {
    it('should add item to end of collection', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        onCollectionChange: (c: UseCollectionReturn<TestItem>) => { collection = c; }
      }));

      const newItem = createTestItem(2);
      let result: boolean;

      act(() => {
        result = collection!.add(newItem);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(2);
      expect(collection!.items[1]).toEqual(newItem);
    });

    it('should add item at specific index', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1), createTestItem(3)],
        onCollectionChange: (c) => { collection = c; }
      }));

      const newItem = createTestItem(2);
      let result: boolean;

      act(() => {
        result = collection!.add(1, newItem);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(3);
      expect(collection!.items[1]).toEqual(newItem);
      expect(collection!.items[0].id).toBe(1);
      expect(collection!.items[2].id).toBe(3);
    });

    it('should return false when adding at invalid index', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.add(-1, createTestItem(2));
      });

      expect(result!).toBe(false);
      expect(collection!.size).toBe(1);

      act(() => {
        result = collection!.add(5, createTestItem(2));
      });

      expect(result!).toBe(false);
      expect(collection!.size).toBe(1);
    });

    it('should add multiple items to end of collection', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        onCollectionChange: (c) => { collection = c; }
      }));

      const newItems = [createTestItem(2), createTestItem(3)];
      let result: boolean;

      act(() => {
        result = collection!.addAll(newItems);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(3);
      expect(collection!.items[1]).toEqual(newItems[0]);
      expect(collection!.items[2]).toEqual(newItems[1]);
    });

    it('should add multiple items at specific index', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1), createTestItem(4)],
        onCollectionChange: (c) => { collection = c; }
      }));

      const newItems = [createTestItem(2), createTestItem(3)];
      let result: boolean;

      act(() => {
        result = collection!.addAll(1, newItems);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(4);
      expect(collection!.items[1]).toEqual(newItems[0]);
      expect(collection!.items[2]).toEqual(newItems[1]);
      expect(collection!.items[3].id).toBe(4);
    });

    it('should return false when adding empty array', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.addAll([]);
      });

      expect(result!).toBe(false);
      expect(collection!.size).toBe(1);
    });
  });

  describe('Remove Operations', () => {
    it('should remove item by value', () => {
      const item1 = createTestItem(1);
      const item2 = createTestItem(2);
      let collection: UseCollectionReturn<TestItem>;

      render(h(TestItemComponent, {
        initialItems: [item1, item2],
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.remove(item1);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(1);
      expect(collection!.items[0]).toEqual(item2);
    });

    it('should return false when removing non-existent item', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.remove(createTestItem(999));
      });

      expect(result!).toBe(false);
      expect(collection!.size).toBe(1);
    });

    it('should remove item by index', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1), createTestItem(2), createTestItem(3)],
        onCollectionChange: (c) => { collection = c; }
      }));

      let removedItem: TestItem | undefined;

      act(() => {
        removedItem = collection!.removeAt(1);
      });

      expect(removedItem!.id).toBe(2);
      expect(collection!.size).toBe(2);
      expect(collection!.items[0].id).toBe(1);
      expect(collection!.items[1].id).toBe(3);
    });

    it('should return undefined when removing at invalid index', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        onCollectionChange: (c) => { collection = c; }
      }));

      let removedItem: TestItem | undefined;

      act(() => {
        removedItem = collection!.removeAt(-1);
      });

      expect(removedItem).toBeUndefined();
      expect(collection!.size).toBe(1);

      act(() => {
        removedItem = collection!.removeAt(5);
      });

      expect(removedItem).toBeUndefined();
      expect(collection!.size).toBe(1);
    });

    it('should remove multiple items', () => {
      const item1 = createTestItem(1);
      const item2 = createTestItem(2);
      const item3 = createTestItem(3);
      let collection: UseCollectionReturn<TestItem>;

      render(h(TestItemComponent, {
        initialItems: [item1, item2, item3],
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.removeAll([item1, item3]);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(1);
      expect(collection!.items[0]).toEqual(item2);
    });

    it('should remove items matching predicate', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [
          createTestItem(1, 'Active1', true),
          createTestItem(2, 'Inactive', false),
          createTestItem(3, 'Active2', true)
        ],
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.removeIf(item => !item.active);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(2);
      expect(collection!.items.every(item => item.active)).toBe(true);
    });

    it('should clear all items', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1), createTestItem(2)],
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.clear();
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(0);
      expect(collection!.isEmpty).toBe(true);
    });

    it('should return false when clearing empty collection', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.clear();
      });

      expect(result!).toBe(false);
    });
  });

  describe('Update Operations', () => {
    it('should set item at index', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1), createTestItem(2)],
        onCollectionChange: (c) => { collection = c; }
      }));

      const newItem = createTestItem(99);
      let previousItem: TestItem | undefined;

      act(() => {
        previousItem = collection!.set(1, newItem);
      });

      expect(previousItem!.id).toBe(2);
      expect(collection!.size).toBe(2);
      expect(collection!.items[1]).toEqual(newItem);
    });

    it('should return undefined when setting at invalid index', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        onCollectionChange: (c) => { collection = c; }
      }));

      let previousItem: TestItem | undefined;

      act(() => {
        previousItem = collection!.set(-1, createTestItem(99));
      });

      expect(previousItem).toBeUndefined();
      expect(collection!.size).toBe(1);
    });
  });

  describe('Query Operations', () => {
    const testItems = [
      createTestItem(1, 'First', true, 'A'),
      createTestItem(2, 'Second', false, 'B'),
      createTestItem(3, 'Third', true, 'A'),
      createTestItem(1, 'Duplicate', true, 'C') // Duplicate ID for testing
    ];

    it('should get item by index', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.get(0)).toEqual(testItems[0]);
      expect(collection!.get(2)).toEqual(testItems[2]);
      expect(collection!.get(-1)).toBeUndefined();
      expect(collection!.get(10)).toBeUndefined();
    });

    it('should find index of item', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.indexOf(testItems[1])).toBe(1);
      expect(collection!.indexOf(createTestItem(999))).toBe(-1);
    });

    it('should find last index of item', () => {
      const duplicateItem = createTestItem(1, 'Same ID');
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [testItems[0], duplicateItem, testItems[0]],
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.lastIndexOf(testItems[0])).toBe(2);
      expect(collection!.lastIndexOf(duplicateItem)).toBe(1);
    });

    it('should check if collection contains item', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.contains(testItems[1])).toBe(true);
      expect(collection!.contains(createTestItem(999))).toBe(false);
    });

    it('should check if collection contains all items', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.containsAll([testItems[0], testItems[2]])).toBe(true);
      expect(collection!.containsAll([testItems[0], createTestItem(999)])).toBe(false);
    });

    it('should create sublist', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const sublist = collection!.subList(1, 3);
      expect(sublist).toHaveLength(2);
      expect(sublist[0]).toEqual(testItems[1]);
      expect(sublist[1]).toEqual(testItems[2]);
    });
  });

  describe('Functional Operations', () => {
    const numericItems = [1, 2, 3, 4, 5].map(createSimpleItem);

    it('should filter items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: numericItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const evenItems = collection!.filter(item => item.value % 2 === 0);
      expect(evenItems).toHaveLength(2);
      expect(evenItems[0].value).toBe(2);
      expect(evenItems[1].value).toBe(4);
    });

    it('should map items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: numericItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const doubled = collection!.map(item => item.value * 2);
      expect(doubled).toEqual([2, 4, 6, 8, 10]);
    });

    it('should flatMap items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [createSimpleItem(1), createSimpleItem(2)],
        onCollectionChange: (c) => { collection = c; }
      }));

      const flattened = collection!.flatMap(item => [item.value, item.value * 2]);
      expect(flattened).toEqual([1, 2, 2, 4]);
    });

    it('should reduce items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: numericItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const sum = collection!.reduce((acc, item) => acc + item.value, 0);
      expect(sum).toBe(15); // 1+2+3+4+5
    });

    it('should execute forEach', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: numericItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const results: number[] = [];
      collection!.forEach((item, index) => {
        results.push(item.value + index);
      });

      expect(results).toEqual([1, 3, 5, 7, 9]); // value + index for each
    });

    it('should find items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: numericItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const found = collection!.find(item => item.value > 3);
      expect(found?.value).toBe(4);

      const notFound = collection!.find(item => item.value > 10);
      expect(notFound).toBeUndefined();
    });

    it('should find index of items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: numericItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const index = collection!.findIndex(item => item.value > 3);
      expect(index).toBe(3); // Fourth item (value 4)

      const notFoundIndex = collection!.findIndex(item => item.value > 10);
      expect(notFoundIndex).toBe(-1);
    });

    it('should test some items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: numericItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.some(item => item.value > 3)).toBe(true);
      expect(collection!.some(item => item.value > 10)).toBe(false);
    });

    it('should test every item', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: numericItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.every(item => item.value > 0)).toBe(true);
      expect(collection!.every(item => item.value > 3)).toBe(false);
    });
  });

  describe('Advanced Operations', () => {
    const testItems = [
      createTestItem(1, 'Item1', true, 'A'),
      createTestItem(2, 'Item2', false, 'B'),
      createTestItem(3, 'Item3', true, 'A'),
      createTestItem(4, 'Item4', false, 'C')
    ];

    it('should partition items', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const [active, inactive] = collection!.partition(item => item.active);
      expect(active).toHaveLength(2);
      expect(inactive).toHaveLength(2);
      expect(active.every(item => item.active)).toBe(true);
      expect(inactive.every(item => !item.active)).toBe(true);
    });

    it('should group items by key', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const grouped = collection!.groupBy(item => item.category);
      expect(grouped.A).toHaveLength(2);
      expect(grouped.B).toHaveLength(1);
      expect(grouped.C).toHaveLength(1);
    });

    it('should get distinct items', () => {
      const duplicates = [
        createSimpleItem(1),
        createSimpleItem(2),
        createSimpleItem(1), // duplicate
        createSimpleItem(3),
        createSimpleItem(2)  // duplicate
      ];

      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: duplicates,
        onCollectionChange: (c) => { collection = c; }
      }));

      const distinct = collection!.distinct();
      expect(distinct).toHaveLength(3);
      expect(distinct.map(item => item.value).sort()).toEqual([1, 2, 3]);
    });

    it('should get distinct items by key', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [
          createTestItem(1, 'Different', true, 'A'),
          createTestItem(2, 'Names', false, 'A'), // Same category
          createTestItem(3, 'Here', true, 'B')
        ],
        onCollectionChange: (c) => { collection = c; }
      }));

      const distinctByCategory = collection!.distinctBy(item => item.category);
      expect(distinctByCategory).toHaveLength(2);
      expect(distinctByCategory[0].category).toBe('A');
      expect(distinctByCategory[1].category).toBe('B');
    });

    it('should chunk items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [1, 2, 3, 4, 5].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      const chunks = collection!.chunk(2);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(2);
      expect(chunks[1]).toHaveLength(2);
      expect(chunks[2]).toHaveLength(1);
      expect(chunks[0][0].value).toBe(1);
      expect(chunks[2][0].value).toBe(5);
    });

    it('should take items while predicate is true', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [1, 2, 3, 4, 5].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      const taken = collection!.takeWhile(item => item.value < 4);
      expect(taken).toHaveLength(3);
      expect(taken.map(item => item.value)).toEqual([1, 2, 3]);
    });

    it('should drop items while predicate is true', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [1, 2, 3, 4, 5].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      const remaining = collection!.dropWhile(item => item.value < 4);
      expect(remaining).toHaveLength(2);
      expect(remaining.map(item => item.value)).toEqual([4, 5]);
    });

    it('should zip with another array', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [1, 2, 3].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      const letters = ['a', 'b', 'c', 'd']; // Extra item to test length limiting
      const zipped = collection!.zip(letters);

      expect(zipped).toHaveLength(3); // Limited by shorter array
      expect(zipped[0][0].value).toBe(1);
      expect(zipped[0][1]).toBe('a');
      expect(zipped[2][0].value).toBe(3);
      expect(zipped[2][1]).toBe('c');
    });
  });

  describe('Utility Operations', () => {
    it('should sort items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [3, 1, 4, 1, 5].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.sort((a, b) => a.value - b.value);
      });

      expect(result!).toBe(true);
      expect(collection!.items.map(item => item.value)).toEqual([1, 1, 3, 4, 5]);
    });

    it('should reverse items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [1, 2, 3].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.reverse();
      });

      expect(result!).toBe(true);
      expect(collection!.items.map(item => item.value)).toEqual([3, 2, 1]);
    });

    it('should shuffle items', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [1, 2, 3, 4, 5].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      const originalOrder = collection!.items.map(item => item.value);
      let result: boolean;

      act(() => {
        result = collection!.shuffle();
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(5);
      // Items should still be the same, just in different order
      const newOrder = collection!.items.map(item => item.value).sort();
      expect(newOrder).toEqual([1, 2, 3, 4, 5]);
    });

    it('should retain only specified items', () => {
      const items = [1, 2, 3, 4, 5].map(createSimpleItem);
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: items,
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.retainAll([items[1], items[3]]);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(2);
      expect(collection!.items[0]).toEqual(items[1]);
      expect(collection!.items[1]).toEqual(items[3]);
    });
  });

  describe('Conversion Operations', () => {
    const testItems = [1, 2, 3].map(createSimpleItem);

    it('should convert to array', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const array = collection!.toArray();
      expect(Array.isArray(array)).toBe(true);
      expect(array).toEqual(testItems);
      expect(array).not.toBe(collection!.items); // Should be a new array
    });

    it('should convert to Set', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const set = collection!.toSet();
      expect(set instanceof Set).toBe(true);
      expect(set.size).toBe(3);
      expect(Array.from(set)).toEqual(testItems);
    });

    it('should convert to Map', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: testItems,
        onCollectionChange: (c) => { collection = c; }
      }));

      const map = collection!.toMap(item => item.value);
      expect(map instanceof Map).toBe(true);
      expect(map.size).toBe(3);
      expect(map.get(2)).toEqual(testItems[1]);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should call onBeforeChange before mutations', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        options: {
          onBeforeChange: mockOnBeforeChange,
          onAfterChange: mockOnAfterChange
        },
        onCollectionChange: (c) => { collection = c; }
      }));

      act(() => {
        collection!.add(createTestItem(2));
      });

      expect(mockOnBeforeChange).toHaveBeenCalledTimes(1);
      const [prevItems, newItems] = mockOnBeforeChange.mock.calls[0];
      expect(prevItems).toHaveLength(1);
      expect(newItems).toHaveLength(2);
    });

    it('should prevent change when onBeforeChange returns false', () => {
      mockOnBeforeChange.mockReturnValue(false);
      let collection: UseCollectionReturn<TestItem>;

      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        options: {
          onBeforeChange: mockOnBeforeChange
        },
        onCollectionChange: (c) => { collection = c; }
      }));

      let result: boolean;

      act(() => {
        result = collection!.add(createTestItem(2));
      });

      expect(result!).toBe(false);
      expect(collection!.size).toBe(1);
      expect(mockOnBeforeChange).toHaveBeenCalledTimes(1);
    });

    it('should call onAfterChange after successful mutations', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        options: {
          onAfterChange: mockOnAfterChange
        },
        onCollectionChange: (c) => { collection = c; }
      }));

      act(() => {
        collection!.add(createTestItem(2));
      });

      expect(mockOnAfterChange).toHaveBeenCalledTimes(1);
      const [prevItems, newItems] = mockOnAfterChange.mock.calls[0];
      expect(prevItems).toHaveLength(1);
      expect(newItems).toHaveLength(2);
    });

    it('should not call onAfterChange when change is prevented', () => {
      mockOnBeforeChange.mockReturnValue(false);
      let collection: UseCollectionReturn<TestItem>;

      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        options: {
          onBeforeChange: mockOnBeforeChange,
          onAfterChange: mockOnAfterChange
        },
        onCollectionChange: (c) => { collection = c; }
      }));

      act(() => {
        collection!.add(createTestItem(2));
      });

      expect(mockOnAfterChange).not.toHaveBeenCalled();
    });
  });

  describe('Custom Equality Function', () => {
    const customEqualityFn = (a: TestItem, b: TestItem) => a.id === b.id;

    it('should use custom equality for operations', () => {
      const item1 = createTestItem(1, 'Original');
      const item1Different = createTestItem(1, 'Different Name'); // Same ID, different name
      let collection: UseCollectionReturn<TestItem>;

      render(h(TestItemComponent, {
        initialItems: [item1, createTestItem(2)],
        options: { equalityFn: customEqualityFn },
        onCollectionChange: (c) => { collection = c; }
      }));

      // Should find the item with same ID but different name
      expect(collection!.contains(item1Different)).toBe(true);
      expect(collection!.indexOf(item1Different)).toBe(0);

      // Should remove the item with same ID
      let result: boolean;
      act(() => {
        result = collection!.remove(item1Different);
      });

      expect(result!).toBe(true);
      expect(collection!.size).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty collection operations gracefully', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.get(0)).toBeUndefined();
      expect(collection!.indexOf(createTestItem(1))).toBe(-1);
      expect(collection!.remove(createTestItem(1))).toBe(false);
      expect(collection!.removeAt(0)).toBeUndefined();
      expect(collection!.clear()).toBe(false);
      expect(collection!.sort()).toBe(false);
      expect(collection!.reverse()).toBe(false);
      expect(collection!.shuffle()).toBe(false);
    });

    it('should handle single item operations', () => {
      let collection: UseCollectionReturn<TestItem>;
      render(h(TestItemComponent, {
        initialItems: [createTestItem(1)],
        onCollectionChange: (c) => { collection = c; }
      }));

      act(() => {
        collection!.reverse();
      });
      expect(collection!.items[0].id).toBe(1);

      act(() => {
        collection!.shuffle();
      });
      expect(collection!.size).toBe(1);
    });

    it('should handle chunk with size larger than collection', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [1, 2].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      const chunks = collection!.chunk(5);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toHaveLength(2);
    });

    it('should handle chunk with zero or negative size', () => {
      let collection: UseCollectionReturn<SimpleItem>;
      render(h(SimpleItemComponent, {
        initialItems: [1, 2].map(createSimpleItem),
        onCollectionChange: (c) => { collection = c; }
      }));

      expect(collection!.chunk(0)).toEqual([]);
      expect(collection!.chunk(-1)).toEqual([]);
    });
  });
});

describe('createCollectionContext', () => {
  const { CollectionProvider, useCollectionContext } = createCollectionContext<TestItem>();

  function ContextTestComponent() {
    const collection = useCollectionContext();
    return h('div', { 'data-testid': 'context-test' }, [`Size: ${collection.size}`]);
  }

  it('should provide collection context to children', () => {
    const initialItems = [createTestItem(1), createTestItem(2)];

    render(
      h(CollectionProvider, { initialItems, children: h(ContextTestComponent, {}) })
    );

    expect(screen.getByTestId('context-test')).toHaveTextContent('Size: 2');
  });

  it('should throw error when useCollectionContext is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(h(ContextTestComponent, {}));
    }).toThrow('useCollectionContext must be used within CollectionProvider');

    console.error = originalError;
  });

  it('should share collection state between multiple consumers', () => {
    function Consumer1() {
      const collection = useCollectionContext();
      return h('div', { 'data-testid': 'consumer1' }, [`Consumer1: ${collection.size}`]);
    }

    function Consumer2() {
      const collection = useCollectionContext();
      return h('div', { 'data-testid': 'consumer2' }, [`Consumer2: ${collection.size}`]);
    }

    render(
      h(CollectionProvider, {
        initialItems: [createTestItem(1)],
        children: h('div', {},
          h(Consumer1, {}),
          h(Consumer2, {})
        )
      })
    );

    expect(screen.getByTestId('consumer1')).toHaveTextContent('Consumer1: 1');
    expect(screen.getByTestId('consumer2')).toHaveTextContent('Consumer2: 1');
  });
});

describe('useCollectionWithSignal', () => {
  it('should sync collection changes with signal', () => {
    const testSignal = signal<readonly TestItem[]>([createTestItem(1)]);
    let collection: UseCollectionReturn<TestItem>;

    function SignalTestComponent() {
      collection = useCollectionWithSignal(
        testSignal,
        (newValue) => { testSignal.value = newValue; }
      );
      return h('div', { 'data-testid': 'signal-test' }, [`Size: ${collection.size}`]);
    }

    render(h(SignalTestComponent, {}));

    expect(collection!.size).toBe(1);
    expect(testSignal.value).toHaveLength(1);

    act(() => {
      collection!.add(createTestItem(2));
    });

    expect(collection!.size).toBe(2);
    expect(testSignal.value).toHaveLength(2);
    expect(testSignal.value[1].id).toBe(2);
  });

  it('should handle signal updates from external sources', () => {
    const testSignal = signal<readonly TestItem[]>([]);
    let collection: UseCollectionReturn<TestItem>;

    function SignalTestComponent() {
      collection = useCollectionWithSignal(
        testSignal,
        (newValue) => { testSignal.value = newValue; }
      );
      return h('div', { 'data-testid': 'signal-test' }, [`Size: ${collection.size}`]);
    }

    const { rerender } = render(h(SignalTestComponent, {}));

    expect(collection!.size).toBe(0);

    // Simulate external signal update
    act(() => {
      testSignal.value = [createTestItem(1), createTestItem(2)];
    });

    rerender(h(SignalTestComponent, {}));

    expect(collection!.size).toBe(2);
  });
});

describe('useCollectionWithSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should provide manual sync functionality', async () => {
    mockOnSync.mockResolvedValue(undefined);
    let collection: UseCollectionReturn<TestItem> & { sync: () => Promise<void> };

    function SyncTestComponent() {
      collection = useCollectionWithSync(
        [createTestItem(1)],
        { onSync: mockOnSync }
      );
      return h('div', { 'data-testid': 'sync-test' }, [`Size: ${collection.size}`]);
    }

    render(h(SyncTestComponent, {}));

    await act(async () => {
      await collection!.sync();
    });

    expect(mockOnSync).toHaveBeenCalledTimes(1);
    expect(mockOnSync).toHaveBeenCalledWith(collection!.items);
  });

  it('should auto-sync on changes when enabled', async () => {
    mockOnSync.mockResolvedValue(undefined);
    let collection: UseCollectionReturn<TestItem> & { sync: () => Promise<void> };

    function SyncTestComponent() {
      collection = useCollectionWithSync(
        [createTestItem(1)],
        {
          onSync: mockOnSync,
          syncOnChange: true,
          debounceMs: 100
        }
      );
      return h('div', { 'data-testid': 'sync-test' }, [`Size: ${collection.size}`]);
    }

    render(h(SyncTestComponent, {}));

    act(() => {
      collection!.add(createTestItem(2));
    });

    // Advance timers to trigger debounced sync
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await act(async () => {
      await Promise.resolve(); // Let async operations complete
    });

    expect(mockOnSync).toHaveBeenCalledTimes(1);
    expect(mockOnSync).toHaveBeenCalledWith(collection!.items);
  });

  it('should debounce auto-sync calls', async () => {
    mockOnSync.mockResolvedValue(undefined);
    let collection: UseCollectionReturn<TestItem> & { sync: () => Promise<void> };

    function SyncTestComponent() {
      collection = useCollectionWithSync<TestItem>(
        [],
        {
          onSync: mockOnSync,
          syncOnChange: true,
          debounceMs: 100
        }
      );
      return h('div', { 'data-testid': 'sync-test' }, [`Size: ${collection.size}`]);
    }

    render(h(SyncTestComponent, {}));

    // Make multiple rapid changes
    act(() => {
      collection!.add(createTestItem(1));
    });

    act(() => {
      collection!.add(createTestItem(2));
    });

    act(() => {
      collection!.add(createTestItem(3));
    });

    // Advance timers to trigger debounced sync
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await act(async () => {
      await Promise.resolve(); // Let async operations complete
    });

    // Should only sync once due to debouncing
    expect(mockOnSync).toHaveBeenCalledTimes(1);
  });

  it('should call onAfterChange from options', async () => {
    let collection: UseCollectionReturn<TestItem> & { sync: () => Promise<void> };

    function SyncTestComponent() {
      collection = useCollectionWithSync(
        [createTestItem(1)],
        { onSync: mockOnSync },
        { onAfterChange: mockOnAfterChange }
      );
      return h('div', { 'data-testid': 'sync-test' }, [`Size: ${collection.size}`]);
    }

    render(h(SyncTestComponent, {}));

    act(() => {
      collection!.add(createTestItem(2));
    });

    expect(mockOnAfterChange).toHaveBeenCalledTimes(1);
  });
});
