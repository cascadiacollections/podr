# Testing Approach for Podr

This document outlines the testing approach for the Podr podcast player application.

## Tools and Libraries

- **Test Framework**: Jest
- **Testing Library**: Preact Testing Library (@testing-library/preact)
- **Assertion Library**: Jest-DOM (@testing-library/jest-dom)

## Test Structure

Tests are organized in `__tests__` directories alongside the components they test:

```
src/
  ui/
    __tests__/
      AppFunctional.test.tsx
      ErrorBoundary.test.tsx
    AppFunctional.tsx
    ErrorBoundary.tsx
```

## Running Tests

Tests can be run with one of the following commands, depending on your preferred package manager:

```bash
npm test
# or
yarn test
```

## Continuous Integration

Tests are automatically run as part of the CI/CD pipeline:

1. In the Node.js CI workflow (runs on every PR and push to main)
2. In the daily build workflow (runs daily and on manual dispatch)

For more information about CI integration, see [CI_TESTING.md](./CI_TESTING.md).

## Testing Patterns

### Component Testing

For component testing, we use the Preact Testing Library which follows the React Testing Library philosophy of testing components as users would interact with them.

Example:
```tsx
// Import the component to test
import { App } from '../AppFunctional';
import { render, screen } from '@testing-library/preact';

test('renders without crashing', () => {
  render(<App />);
  const title = screen.getByText('Podr');
  expect(title).toBeInTheDocument();
});
```

### Testing Error Boundaries

Error boundaries require special testing because they are designed to catch errors. We use a test component that deliberately throws an error to test this functionality.

```tsx
const ErrorThrowingComponent = () => {
  throw new Error('Test error');
  return null;
};

test('renders fallback UI when an error occurs', () => {
  render(
    <ErrorBoundary>
      <ErrorThrowingComponent />
    </ErrorBoundary>
  );
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

### Mocking

For external dependencies like fetch, we use Jest's mocking capabilities:

```tsx
// Mock fetch API
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ /* mock data */ })
  })
);
```

### Testing Components with User Interactions

For components that handle user interactions, we test both the rendering and the behavior:

```tsx
test('handles search functionality', async () => {
  render(<SearchComponent />);
  
  // Find search input and submit button
  const searchInput = screen.getByPlaceholderText(/search podcasts/i);
  const searchButton = screen.getByRole('button', { name: /search/i });
  
  // Perform search
  fireEvent.input(searchInput, { target: { value: 'test query' } });
  fireEvent.click(searchButton);
  
  // Verify search API was called
  await waitFor(() => {
    expect(fetch).toHaveBeenCalled();
  });
  
  // Wait for search results to appear
  await waitFor(() => {
    expect(screen.getByText(/Results for/i)).toBeInTheDocument();
  });
});
```

### Testing Async Operations

For components that perform asynchronous operations:

```tsx
test('loads data asynchronously', async () => {
  // Mock the fetch response
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: 'test data' })
    })
  );

  render(<AsyncComponent />);
  
  // Check for loading state
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('test data')).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it.
2. **Use Data Attributes**: Use data-testid attributes for selecting elements that don't have unique text content.
3. **Mock External Dependencies**: Mock external API calls and other dependencies.
4. **Setup and Teardown**: Use beforeEach/afterEach for setup and cleanup.
5. **Follow AAA Pattern**: Arrange (setup), Act (execute), Assert (verify) for clear test structure.
6. **Isolate Tests**: Each test should be independent and not rely on the state from other tests.
7. **Test Edge Cases**: Include tests for error states, empty states, and boundary conditions.
8. **Keep Tests Simple**: Each test should verify a single concept or behavior.
9. **Avoid Test Redundancy**: Don't duplicate test coverage unnecessarily.