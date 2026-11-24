import { h } from 'preact';
import { fireEvent, render, screen } from '@testing-library/preact';
import { Signal } from '@preact/signals';

import { APP_CONFIG } from '../../utils/AppContext';
import { Search } from '../Search';

// Mock the hooks to prevent errors
jest.mock('../../utils/hooks', () => ({
  useAnalytics: () => ({
    trackSearch: jest.fn(),
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

  test('uses the configured minimum length', () => {
    const onSearch = jest.fn();
    const minimum = APP_CONFIG.SEARCH.MIN_QUERY_LENGTH;

    render(<Search onSearch={onSearch} />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'a'.repeat(minimum - 1) } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onSearch).toHaveBeenLastCalledWith('');

    fireEvent.change(input, { target: { value: 'a'.repeat(minimum) } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onSearch).toHaveBeenLastCalledWith('a'.repeat(minimum));
  });
});