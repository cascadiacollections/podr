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

  test('should initialize with window data when available', () => {
    // Setup window variable before hook is called
    global.window.TEST_VARIABLE = { products: [{ id: 2, name: 'Inlined Product' }] };
    
    // Use the hook - should initialize with window data
    const { data, isLoading, error } = useApiInliner('TEST_VARIABLE', 'test.json');
    
    // Verify results - should have data immediately with no loading state
    expect(isLoading).toBe(false);
    expect(error).toBe(null);
    expect(data).toEqual({ products: [{ id: 2, name: 'Inlined Product' }] });
    
    // Fetch should not be called
    expect(fetch).not.toHaveBeenCalled();
  });
  
  test('should return data from window object when available', () => {
    // Use the hook - will initialize without window data
    const { data, isLoading, error } = useApiInliner('TEST_VARIABLE', 'test.json');
    
    // Set window variable after hook initialization
    global.window.TEST_VARIABLE = { products: [{ id: 2, name: 'Inlined Product' }] };
    
    // Call the effect manually (since our mock doesn't automatically run effects)
    require('preact/hooks').useEffect.mock.calls[0][0]();
    
    // Verify results
    expect(isLoading).toBe(false);
    expect(error).toBe(null);
    
    // Fetch should not be called
    expect(fetch).not.toHaveBeenCalled();
  });
  
  test('should fetch data from JSON file when window object not available', async () => {
    // Use the hook - with no window variable available
    const { data, isLoading, error } = useApiInliner('MISSING_VARIABLE', 'test.json');
    
    // Verify initial loading state is true since no window data is available
    expect(isLoading).toBe(true);
    
    // Call the effect manually (since our mock doesn't automatically run effects)
    require('preact/hooks').useEffect.mock.calls[1][0]();
    
    // Verify fetch was called with the right URL
    expect(fetch).toHaveBeenCalledWith('/test.json', undefined);
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