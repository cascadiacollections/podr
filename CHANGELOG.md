# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive CONTRIBUTING.md with development guidelines
- SECURITY.md for responsible vulnerability disclosure
- PR template with detailed checklists
- .gitattributes for consistent line endings
- .nvmrc and .node-version for Node.js version management
- GitHub funding configuration
- Modern copilot instructions with security and performance sections

### Changed
- Updated all GitHub Actions workflows to use Node.js 24 LTS consistently
- Updated GitHub Actions cache from v3 to v4
- Upgraded devcontainer to Node.js 24 with Debian Bookworm
- Enhanced README with modern prerequisites
- Improved copilot instructions with deployment and environment details

### Removed
- Removed problematic prebuild browserslist script that caused build failures

### Fixed
- Fixed inconsistent Node.js versions across workflows (20 vs 24)
- Resolved build failures related to browserslist database updates

### Security
- Added security audit step to CI workflow
- Added security-events permission to workflows
- Documented security best practices

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release of Podr podcast web player
- Preact-based modern web application
- TypeScript with strict mode
- Comprehensive test suite with Jest
- Heft build system integration
- Webpack 5 bundling
- Netlify deployment configuration
- Dev container support
- CodeQL security scanning
- Dependabot configuration

[Unreleased]: https://github.com/cascadiacollections/podr/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cascadiacollections/podr/releases/tag/v1.0.0
