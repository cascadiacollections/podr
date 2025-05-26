# CI Testing Integration

This document provides information about how the unit tests are integrated into the CI workflows.

## Current Status

The unit tests have been added to both the Node.js CI workflow and the daily build workflow.
Tests are configured to run in a fail-fast mode, meaning that if any test fails, the build will fail.

## Test Execution

Tests are run using the standard `yarn test` command in the CI process, which executes Jest with the project's test configuration. The tests run:

1. Before the build step in the regular CI workflow 
2. After security audit but before build in the daily workflow

## Future Improvements

1. Add test coverage reporting 
2. Implement test results visualization in the CI dashboard
3. Add performance testing for critical user flows

## Running Tests Locally

To run the tests locally:

```bash
yarn test
```

For more information about the testing approach, see [TESTING.md](./TESTING.md).