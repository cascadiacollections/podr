import { renderHook } from '@testing-library/preact';
import { useAnalytics } from '../hooks';

describe('useAnalytics().trackSearch', () => {
  beforeEach(() => {
    window.gtag = jest.fn();
  });

  test('reports that a search happened without the search text', () => {
    const { result } = renderHook(() => useAnalytics());

    result.current.trackSearch('my private query', 3);

    expect(window.gtag).toHaveBeenCalledTimes(1);
    const [, action, params] = (window.gtag as jest.Mock).mock.calls[0];
    expect(action).toBe('search');
    expect(params).toEqual({ search_term_length: 16, results_count: 3, transport_type: 'beacon' });
    expect(JSON.stringify(params)).not.toContain('my private query');
  });
});
