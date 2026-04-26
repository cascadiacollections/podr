# 🎧 Podr

<div align="center">

[![Node.js CI](https://github.com/cascadiacollections/podr/actions/workflows/node.js.yml/badge.svg)](https://github.com/cascadiacollections/podr/actions/workflows/node.js.yml)
[![Daily Build](https://github.com/cascadiacollections/podr/actions/workflows/daily-build.yml/badge.svg)](https://github.com/cascadiacollections/podr/actions/workflows/daily-build.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/f066f5b0-8c2c-4a63-a776-5ecb880f76ad/deploy-status)](https://app.netlify.com/sites/podr/deploys)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Preact](https://img.shields.io/badge/Preact-673AB8?style=flat&logo=preact&logoColor=white)](https://preactjs.com/)

**🎵 A modern, blazing-fast podcast discovery and player for the web**

*Discover trending podcasts, save your favorites, and enjoy a clean listening experience*

[🚀 **Try Live Demo**](https://podr.netlify.app) • [📖 Documentation](docs/) • [🐛 Report Bug](../../issues) • [💡 Request Feature](../../issues)

</div>

---

## 🌟 Why Podr?

> **"The fastest way to discover and enjoy podcasts on the web"**

Podr revolutionizes podcast discovery with lightning-fast performance and a beautifully crafted user experience. Built for podcast enthusiasts who demand speed, simplicity, and style.

### 🎯 **Perfect For:**
- 🔍 **Podcast Discovery** - Find trending shows instantly
- ⭐ **Curated Collections** - Save and organize your favorites
- 🚀 **Quick Access** - Zero-delay browsing with offline capabilities
- 📱 **Any Device** - Seamless experience across all screen sizes

## ✨ Features

### 🚀 **Performance First**
- ⚡ **Instant Loading** - Top podcasts data pre-loaded for zero-wait discovery
- 🔄 **Auto-Refresh** - Daily automated builds ensure fresh content
- 📦 **Optimized Bundles** - Lightweight architecture with aggressive caching
- 🛡️ **Rock Solid** - 99.9% uptime with global CDN delivery

### 🎨 **Beautiful Experience**
- 📱 **Responsive Design** - Pixel-perfect on mobile, tablet, and desktop
- � **Modern UI** - Clean, intuitive interface with smooth animations
- ⚡ **Lightning Search** - Find any podcast in milliseconds
- ⭐ **Smart Favorites** - One-click bookmarking with persistent storage

### �️ **Developer Ready**
- 🔧 **Modern Stack** - Preact + TypeScript + cutting-edge tooling
- 🧪 **Fully Tested** - Comprehensive test suite with 90%+ coverage
- � **Security First** - CSP headers, HTTPS, and secure dependencies
- 🌐 **PWA Ready** - Offline capabilities and installable experience

## 🛠️ Tech Stack

<table>
<tr>
<td>

**🎨 Frontend**
- [Preact](https://preactjs.com/) - React alternative (3KB)
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Preact Signals](https://preactjs.com/guide/v10/signals/) - State management
- [SCSS](https://sass-lang.com/) + [PostCSS](https://postcss.org/) - Modern styling

</td>
<td>

**⚡ Build & Deploy**
- [Heft](https://rushstack.io/pages/heft/) - Build orchestration
- [Webpack 5](https://webpack.js.org/) - Module bundling
- [GitHub Actions](https://github.com/features/actions) - CI/CD
- [Netlify](https://netlify.com/) - Edge deployment

</td>
</tr>
<tr>
<td>

**🧪 Testing & Quality**
- [Jest](https://jestjs.io/) - Testing framework
- [Testing Library](https://testing-library.com/) - Component testing
- [ESLint](https://eslint.org/) - Code linting
- [Prettier](https://prettier.io/) - Code formatting

</td>
<td>

**🔧 Developer Experience**
- [Dev Containers](https://containers.dev/) - Consistent environment
- [VS Code](https://code.visualstudio.com/) - Optimized workspace
- [Git Hooks](https://git-scm.com/docs/githooks) - Quality gates
- [TypeScript](https://www.typescriptlang.org/) - IntelliSense

</td>
</tr>
</table>

## 🚀 Quick Start

### 📋 Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| **Node.js** | 24+ LTS | [nodejs.org](https://nodejs.org/) |
| **Yarn** | 1.22+ or 4+ | [yarnpkg.com](https://yarnpkg.com/) |
| **Git** | 2.0+ | [git-scm.com](https://git-scm.com/) |

### ⚡ Installation

```bash
# 📥 Clone the repository
gh repo clone cascadiacollections/podr
# or using git
git clone https://github.com/cascadiacollections/podr.git

# 📂 Navigate to project directory
cd podr

# 📦 Install dependencies
yarn install

# 🚀 Start development server
yarn start
```

> 🎉 **Success!** Open [http://localhost:9000](http://localhost:9000) to see Podr in action!

## 📲 Install Podr as an App (PWA)

Podr is an installable Progressive Web App. Once installed it runs in its own window, launches from the OS app launcher, and works offline for the app shell and recently-viewed content.

- **Microsoft Edge / Chrome (desktop)**: visit [podrapp.com](https://podrapp.com), then click the **Install app** icon in the address bar (or *Settings → Apps → Install this site as an app*).
- **Safari (macOS)**: *File → Add to Dock…*
- **iOS Safari**: *Share → Add to Home Screen*.
- **Android Chrome**: tap the **⋮** menu → *Install app*.

Caching is powered by [Workbox](https://developer.chrome.com/docs/workbox): the app shell is precached, podcast artwork is cached on first request, and API responses use a stale-while-revalidate strategy.

## 📋 Development Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `yarn start` | 🔥 Start dev server with hot reload | Development |
| `yarn build` | 📦 Build for production | Local testing |
| `yarn build:ci` | 🚀 Optimized CI/production build | Deployment |
| `yarn test` | 🧪 Run all tests | Validation |
| `yarn test:watch` | 👀 Tests in watch mode | Development |
| `yarn test:coverage` | 📊 Coverage report | Quality check |
| `yarn lint` | 🔍 Check code quality with ESLint | Pre-commit |
| `yarn lint:fix` | 🔧 Auto-fix ESLint issues | Cleanup |

### 🔄 Development Workflow

```bash
# 1. Start development
yarn start              # Launch dev server

# 2. Make changes
# Edit files in src/ - hot reload active!

# 3. Lint your code
yarn lint               # Check for issues
yarn lint:fix           # Auto-fix problems

# 4. Test your changes
yarn test:watch         # Run tests continuously

# 5. Check code quality
yarn test:coverage      # Ensure coverage targets met
```

## 🏗️ Project Architecture

### 📁 Repository Structure

This repository is organized as a monorepo containing the main Podr application and reusable packages:

```
📦 podr/
├── 📱 src/                           # Main Podr application
│   ├── 🎨 ui/                        # React/Preact components
│   │   ├── 🧪 __tests__/             # Component test suites
│   │   ├── 📱 App.tsx                # Main application shell
│   │   ├── 🔍 Search.tsx             # Podcast search interface
│   │   ├── 📋 List.tsx               # Podcast listing component
│   │   ├── 📄 Result.tsx             # Individual search results
│   │   └── 🛡️ ErrorBoundary.tsx      # Error handling wrapper
│   ├── 🛠️ utils/                     # Shared utilities & helpers
│   │   ├── 🌐 AppContext.tsx         # Global application state
│   │   ├── 🔧 helpers.ts             # Pure utility functions
│   │   └── 🪝 hooks.ts               # Custom React hooks
│   ├── 📝 types/                     # TypeScript type definitions
│   │   └── testing-library__jest-dom.d.ts
│   └── 🎨 app.scss                   # Global styles & variables
└── 📦 packages/                      # Reusable packages
    └── 🔌 webpack-api-inliner-plugin/ # API inlining webpack plugin
        ├── 📖 README.md              # Plugin documentation
        ├── 📝 CHANGELOG.md           # Release notes
        ├── 🔧 index.ts               # Main plugin implementation
        └── 📋 package.json           # Package configuration
```

### 📦 Packages

- **[webpack-api-inliner-plugin](packages/webpack-api-inliner-plugin/)** - A webpack plugin that fetches API data at build time and inlines it for faster initial page rendering

### 🏛️ Architecture Principles

- **🧩 Component-Based** - Modular, reusable UI components
- **📱 Mobile-First** - Responsive design from ground up
- **⚡ Performance** - Code splitting and lazy loading
- **🔒 Type Safety** - Comprehensive TypeScript coverage
- **🧪 Test Coverage** - Unit and integration testing
- **♿ Accessibility** - WCAG 2.1 AA compliance

### 🐳 Dev Container Setup

Experience **zero-config development** with our containerized environment:

```bash
# 🚀 One-click setup in VS Code
code .                  # VS Code will prompt for container reopen
```

**🎁 What's Included:**
- ✅ **Node.js 24** - Latest LTS with optimal performance
- ✅ **Yarn** - Fast, reliable package management
- ✅ **Git + Git LFS** - Full version control with large files
- ✅ **GitHub CLI** - Streamlined GitHub workflow
- ✅ **VS Code Extensions** - Pre-configured development tools

**📦 Pre-installed Extensions:**
- ESLint + Prettier - Code quality and formatting
- TypeScript - Enhanced IntelliSense
- CSS Peek - Quick stylesheet navigation
- Auto Rename Tag - Synchronized tag editing
- GitLens - Advanced Git visualization

> 💡 **Pro Tip:** The dev container ensures every team member has an identical development environment!

### 🔧 Code Quality Standards

We maintain **enterprise-grade code quality** through automated tooling:

<table>
<tr>
<td>

**📏 Linting & Formatting**
- **ESLint 9** - Modern flat config with TypeScript support
- **React Performance Rules** - Prevents unnecessary re-renders
  - `eslint-plugin-react` - Standard React linting
  - `eslint-plugin-react-perf` - Performance-focused rules
- **Prettier** - Consistent code formatting
- **Import Organization** - Auto-sorted imports
- **EditorConfig** - Cross-IDE consistency

</td>
<td>

**🎯 Type Safety**
- **TypeScript** - 100% type coverage goal
- **Strict Mode** - Maximum type checking
- **Path Aliases** - Clean import statements
- **Modern JSX** - Latest React patterns

</td>
</tr>
</table>

```bash
# 🔍 Check code quality
yarn lint               # Run ESLint checks (catches re-render issues)
yarn lint:fix           # Auto-fix ESLint issues
yarn format             # Format with Prettier
yarn type-check         # TypeScript validation
```

> 💡 **Performance Tip:** ESLint now catches common re-render issues like inline arrow functions and object/array literals in JSX. See [docs/ESLINT.md](docs/ESLINT.md) for details.

## 🧪 Testing Strategy

**Comprehensive testing** ensures reliability and prevents regressions:

### 🎯 Testing Philosophy
- **💯 High Coverage** - Target 90%+ code coverage
- **🧩 Component Focus** - Test behavior, not implementation
- **⚡ Fast Feedback** - Sub-second test execution
- **🔄 Continuous** - Tests run on every commit

### 🛠️ Testing Commands

```bash
# 🚀 Quick test run
yarn test                    # Run full test suite

# 👀 Development mode
yarn test:watch             # Watch mode with hot reload

# 📊 Coverage analysis
yarn test:coverage          # Generate detailed coverage report

# 🔍 Specific test patterns
yarn test Button            # Test files matching "Button"
yarn test --testNamePattern="search" # Test names containing "search"
```

### 📋 What We Test
- ✅ **Component Rendering** - UI components render correctly
- ✅ **User Interactions** - Clicks, inputs, and navigation
- ✅ **State Management** - Context and hooks behavior
- ✅ **API Integration** - Mock external dependencies
- ✅ **Error Boundaries** - Graceful error handling

> 📊 **Coverage Reports** are automatically generated and stored in `coverage/` directory

## 🚀 Deployment & CI/CD

### 🌐 Automated Deployment Pipeline

**Zero-downtime deployments** with enterprise-grade reliability:

```mermaid
graph LR
    A[Push to main] --> B[GitHub Actions]
    B --> C[Build & Test]
    C --> D[Deploy to Netlify]
    D --> E[Live on podr.netlify.app]
```

### 🎯 Deployment Features

<table>
<tr>
<td>

**🔄 Continuous Deployment**
- ✅ **Auto Deploy** - Every `main` push goes live
- ✅ **Preview Deploys** - Each PR gets preview URL
- ✅ **Rollback Ready** - One-click revert capability
- ✅ **Zero Downtime** - Seamless deployments

</td>
<td>

**⚡ Performance Optimized**
- ✅ **Global CDN** - Edge caching worldwide
- ✅ **Compression** - Gzip/Brotli for all assets
- ✅ **Caching** - Aggressive browser caching
- ✅ **Security Headers** - CSP, HSTS, and more

</td>
</tr>
</table>

### 🛠️ Manual Deployment

```bash
# 📦 Build for production
yarn build:ci               # Optimized production build

# 🚀 Deploy to Netlify (if CLI configured)
netlify deploy --prod --dir=dist

# 🔍 Preview deployment locally
yarn serve                  # Serve built files locally
```

### 📈 Build Optimizations

- **🗜️ Bundle Splitting** - Separate vendor and app chunks
- **🎯 Tree Shaking** - Dead code elimination
- **📦 Asset Optimization** - Image compression and minification
- **🔗 Preload Hints** - Critical resource prioritization

## 🤝 Contributing

**We ❤️ contributions!** Help make Podr even better for the podcast community.

### 🚀 Quick Contribution Guide

```bash
# 1. 🍴 Fork the repository
gh repo fork cascadiacollections/podr

# 2. 🌟 Create feature branch
git checkout -b feature/amazing-feature

# 3. ✨ Make your changes
# Edit files, add tests, update docs

# 4. ✅ Verify quality
yarn test                    # Run tests
yarn build                   # Ensure it builds

# 5. 📝 Commit with clear message
git commit -m "feat: add amazing feature that does X"

# 6. 🚀 Push and create PR
git push origin feature/amazing-feature
gh pr create --title "Add amazing feature" --body "Description of changes"
```

### 🎯 Contribution Types

| Type | Description | Examples |
|------|-------------|----------|
| 🐛 **Bug Fixes** | Fix broken functionality | Resolve search issues, fix styling |
| ✨ **Features** | Add new capabilities | New UI components, API integrations |
| 📚 **Documentation** | Improve project docs | README updates, code comments |
| ⚡ **Performance** | Speed improvements | Bundle optimization, caching |
| 🧹 **Refactoring** | Code quality improvements | TypeScript migration, cleanup |
| 🔒 **Security** | Security improvements | Vulnerability fixes, updates |

### 📋 Contribution Guidelines

- ✅ **Follow Code Style** - ESLint + Prettier enforced
- ✅ **Write Tests** - Maintain 90%+ coverage
- ✅ **Update Docs** - Keep README and comments current
- ✅ **Small PRs** - Focused, reviewable changes
- ✅ **Clear Commits** - Use conventional commit format
- ✅ **Security First** - Report vulnerabilities privately (see [SECURITY.md](SECURITY.md))

> 📖 **Detailed guidelines:** See [CONTRIBUTING.md](CONTRIBUTING.md) for complete information

## 🔒 Security

We take security seriously. If you discover a security vulnerability:
- **DO NOT** open a public issue
- See [SECURITY.md](SECURITY.md) for responsible disclosure instructions
- Email: kevintcoughlin@users.noreply.github.com

## � Project Stats

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/cascadiacollections/podr)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/cascadiacollections/podr)
![GitHub last commit](https://img.shields.io/github/last-commit/cascadiacollections/podr)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/cascadiacollections/podr)

</div>

---

## �📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**🎉 Free to use, modify, and distribute!**

---

## 🙏 Acknowledgments

**Podr stands on the shoulders of giants:**

<table>
<tr>
<td align="center">

**🚀 Performance**
[Preact](https://preactjs.com/) - Lightning-fast React alternative
[Rush Stack](https://rushstack.io/) - Enterprise build tools

</td>
<td align="center">

**🎨 Design**
[Pico.css](https://picocss.com/) - Elegant minimal framework
[PostCSS](https://postcss.org/) - Modern CSS processing

</td>
<td align="center">

**☁️ Infrastructure**
[Netlify](https://netlify.com/) - Global edge deployment
[GitHub Actions](https://github.com/features/actions) - CI/CD automation

</td>
</tr>
</table>

---

<div align="center">

**🎵 Made with ❤️ by the Podr team**

*Empowering podcast discovery, one search at a time*

**[⭐ Give us a star](../../stargazers) if Podr helped you discover amazing podcasts!**

</div>
