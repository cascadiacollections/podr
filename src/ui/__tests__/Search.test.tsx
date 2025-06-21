import { h } from 'preact';
import { render } from '@testing-library/preact';
import { Search } from '../Search';
import { Signal } from '@preact/signals';

// Mock the hooks to prevent errors
jest.mock('../../utils/hooks', () => ({
  useAnalytics: () => ({
    trackSearch: jest.fn(),
  }),
  useClassNames: jest.fn((...args) => {
    // Simple mock that handles object conditions
    return args.flat().map(arg => {
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'object' && arg !== null) {
        return Object.entries(arg)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(' ');
      }
      return '';
    }).filter(Boolean).join(' ');
  }),
}));

describe('Search component', () => {
  test('renders correctly', () => {
    const onSearch = jest.fn();
    const { container } = render(<Search onSearch={onSearch} />);
    expect(container).toMatchSnapshot();
  });

  test('renders with query signal', () => {
    const onSearch = jest.fn();
    const querySignal = { value: 'test query' } as Signal<string>;
    const { container } = render(<Search onSearch={onSearch} querySignal={querySignal} />);
    expect(container).toMatchSnapshot();
  });
});