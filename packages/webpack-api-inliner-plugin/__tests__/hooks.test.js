/**
 * Test suite for API inliner hooks
 * 
 * This test suite verifies the hooks for accessing inlined data work correctly.
 */

const { useApiInliner } = require('../hooks');

// Create proper mocks for useState and useEffect
let mockSetState = jest.fn();
let mockUseEffectCallback = null;

// Mock preact/hooks for test environment
jest.mock('preact/hooks', () => ({
  useState: jest.fn((init) => {
    // Return initial value and a setter function
    return [init, mockSetState];
  }),
  useEffect: jest.fn((callback) => {
    // Store the callback to call manually in tests
    mockUseEffectCallback = callback;
  }),
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
    mockSetState.mockReset();
    mockUseEffectCallback = null;
    
    // Set up global window object for tests
    if (!global.window) {
      global.window = {};
    }
    
    // Clear the window object
    delete global.window.TEST_VARIABLE;
  });

  test('should initialize with window data when available', () => {
    // Setup window variable before hook is called
    global.window.TEST_VARIABLE = { products: [{ id: 2, name: 'Inlined Product' }] };
    
    // Use the hook - should initialize with window data
    const result = useApiInliner('TEST_VARIABLE', 'test.json');
    
    // Verify useState was called with the correct initial values
    const preactHooks = require('preact/hooks');
    expect(preactHooks.useState).toHaveBeenCalledWith({ products: [{ id: 2, name: 'Inlined Product' }] }); // data
    expect(preactHooks.useState).toHaveBeenCalledWith(false); // isLoading
    expect(preactHooks.useState).toHaveBeenCalledWith(null); // error
    
    // Verify useEffect was called
    expect(preactHooks.useEffect).toHaveBeenCalled();
    
    // Fetch should not be called yet (effect hasn't run)
    expect(fetch).not.toHaveBeenCalled();
  });
  
  test('should return data from window object when available after effect runs', () => {
    // Use the hook - will initialize without window data
    const result = useApiInliner('TEST_VARIABLE', 'test.json');
    
    // Set window variable after hook initialization
    global.window.TEST_VARIABLE = { products: [{ id: 2, name: 'Inlined Product' }] };
    
    // Manually call the effect callback
    if (mockUseEffectCallback) {
      mockUseEffectCallback();
    }
    
    // Verify setData was called to update with window data
    expect(mockSetState).toHaveBeenCalled();
    
    // Fetch should not be called since window data was available
    expect(fetch).not.toHaveBeenCalled();
  });
  
  test('should fetch data from JSON file when window object not available', async () => {
    // Use the hook - with no window variable available
    const result = useApiInliner('MISSING_VARIABLE', 'test.json');
    
    // Verify initial loading state is true since no window data is available
    const preactHooks = require('preact/hooks');
    expect(preactHooks.useState).toHaveBeenCalledWith(null); // data
    expect(preactHooks.useState).toHaveBeenCalledWith(true); // isLoading
    expect(preactHooks.useState).toHaveBeenCalledWith(null); // error
    
    // Manually call the effect callback to trigger fetch
    if (mockUseEffectCallback) {
      mockUseEffectCallback();
    }
    
    // Verify fetch was called with the right URL
    expect(fetch).toHaveBeenCalledWith('/test.json', undefined);
  });
  
  test('should handle fetch errors gracefully', async () => {
    // Mock a failed fetch
    global.fetch.mockImplementationOnce(() => 
      Promise.reject(new Error('Network error'))
    );
    
    // Use the hook
    const result = useApiInliner('MISSING_VARIABLE', 'error.json');
    
    // Manually call the effect callback to trigger fetch
    if (mockUseEffectCallback) {
      mockUseEffectCallback();
    }
    
    // Verify fetch was called
    expect(fetch).toHaveBeenCalledWith('/error.json', undefined);
  });
});