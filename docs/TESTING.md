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

Tests can be run with the following command:

```bash
npm test
```

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

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the component does, not how it does it.
2. **Use Data Attributes**: Use data-testid attributes for selecting elements that don't have unique text content.
3. **Mock External Dependencies**: Mock external API calls and other dependencies.
4. **Setup and Teardown**: Use beforeEach/afterEach for setup and cleanup.