# Changelog

All notable changes to the Webpack API Inliner Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-11-01

### Changed
- Removed runtime ts-node dependency for better build performance
- Use pre-compiled JavaScript from packages directory for improved performance
- Optimized useApiInliner hook with proper dependency tracking to prevent unnecessary re-renders

### Fixed
- Fixed useMemo dependencies to include variableName for dynamic variables
- Optimized window availability check to avoid redundant evaluations
- Improved options memoization to avoid recomputing JSON.stringify
- Removed initialData from useEffect dependencies to prevent re-renders
- Fixed dependency array issues that could cause infinite loops

### Added
- Added AbortController for cleanup to prevent memory leaks
- Implemented hook caching to avoid repeated lookups
- Added exponential backoff for API retries with configurable delays (up to 5 seconds)
- Added comprehensive comments explaining dependency optimizations

### Performance
- Pre-compiled TypeScript eliminates runtime compilation overhead
- Parallel endpoint processing for concurrent API fetches
- Immutable data structures prevent unnecessary object mutations
- Efficient caching mechanism reuses data across webpack compilation phases
- Modern fetch API with native Node.js support
- Proper cleanup handlers ensure no memory leaks

## [1.0.1] - 2025-06-01

### Fixed
- Resolved webpack plugin publish test failures by improving test mocks
- Added preact dependency to fix testing framework compatibility issues
- Enhanced test coverage and mock implementations

## [1.0.0] - 2024-12-01

### Added
- Initial release of the Webpack API Inliner Plugin
- Build-time API data fetching and inlining capabilities
- Support for both window variable injection and static JSON file generation
- TypeScript support with full type definitions
- Configuration-driven approach with JSON schema validation
- Fallback data support for development and error scenarios
- Retry mechanism for failed API requests
- Compatible with RushStack/Heft build systems
- Comprehensive documentation and examples

### Features
- Fetch API data during webpack build process
- Inline data as window variables for instant access
- Generate static JSON files for traditional loading
- Configurable request timeouts and retry counts
- Custom variable naming for inlined data
- Production/development mode switching
- Error handling with graceful fallbacks

### Technical Details
- Supports webpack 5.0+
- Requires Node.js 18.0+
- Compatible with html-webpack-plugin 5.0+
- Full TypeScript implementation
- ESLint and Prettier configured
- Jest testing framework setup