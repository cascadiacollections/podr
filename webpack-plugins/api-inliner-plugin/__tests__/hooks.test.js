/**
 * Test suite for API inliner hooks
 * 
 * This test suite verifies the hooks for accessing inlined data work correctly.
 */

const { useApiInliner } = require('../hooks');

// Mock preact/hooks for test environment
jest.mock('preact/hooks', () => ({
  useState: jest.fn((init) => [init, jest.fn()]),
  useEffect: jest.fn((fn) => fn()),
}));

// Mock fetch API
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ products: [{ id: 1, name: 'Test Product' }] })
  })
);

describe('useApiInliner hook', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Clear the window object
    delete global.window.TEST_VARIABLE;
  });

  test('should return data from window object when available', () => {
    // Setup window variable
    global.window.TEST_VARIABLE = { products: [{ id: 2, name: 'Inlined Product' }] };
    
    // Use the hook
    const { data, isLoading, error } = useApiInliner('TEST_VARIABLE', 'test.json');
    
    // Verify results
    expect(isLoading).toBe(false);
    expect(error).toBe(null);
    expect(data).toEqual({ products: [{ id: 2, name: 'Inlined Product' }] });
    
    // Fetch should not be called
    expect(fetch).not.toHaveBeenCalled();
  });
  
  test('should fetch data from JSON file when window object not available', async () => {
    // Use the hook
    const { data, isLoading, error } = useApiInliner('MISSING_VARIABLE', 'test.json');
    
    // Verify fetch was called with the right URL
    expect(fetch).toHaveBeenCalledWith('/test.json', undefined);
    
    // Initial state should indicate loading
    expect(isLoading).toBe(true);
  });
  
  test('should handle fetch errors gracefully', async () => {
    // Mock a failed fetch
    global.fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );
    
    // Use the hook
    const { data, isLoading, error } = useApiInliner('MISSING_VARIABLE', 'error.json');
    
    // Verify fetch was called
    expect(fetch).toHaveBeenCalledWith('/error.json', undefined);
  });
});