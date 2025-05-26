# CI Testing Integration

This document provides information about how the unit tests are integrated into the CI workflows.

## Current Status

The unit tests have been added to both the Node.js CI workflow and the daily build workflow.
Currently, these tests are set to `continue-on-error: true` to allow the build to proceed even if tests fail.

## Future Improvements

1. Fix any test configuration issues to ensure tests run reliably in the CI environment
2. Remove the `continue-on-error` flag once tests are stable
3. Add test coverage reporting 
4. Implement test results visualization in the CI dashboard

## Running Tests Locally

To run the tests locally:

```bash
yarn test
```

For more information about the testing approach, see [TESTING.md](./TESTING.md).