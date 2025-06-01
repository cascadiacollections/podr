# Changelog

All notable changes to the Webpack API Inliner Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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