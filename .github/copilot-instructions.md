# GitHub Copilot Instructions for Podr

## Project Overview

**Podr** is an open-source podcast web player built as a modern, performant web application. This is a TypeScript monorepo that prioritizes developer experience, code quality, and performance.

### 🎯 Project Purpose
- Provide a beautiful, fast podcast discovery and playback experience
- Demonstrate modern web development practices and tools
- Maintain enterprise-grade code quality standards
- Support both desktop and mobile users

## 🏗️ Architecture & Tech Stack

### Core Technologies
- **Frontend Framework**: Preact (React-compatible, lighter alternative)
- **Language**: TypeScript with strict mode enabled
- **Build System**: Microsoft Rush Stack (Heft) + Webpack 5
- **Styling**: SCSS with PostCSS for modern CSS features
- **Testing**: Jest + Preact Testing Library
- **Code Quality**: ESLint (Rush Stack config) + Prettier

### Key Dependencies
```json
{
  "preact": "10.24.0",
  "@preact/signals": "^2.0.5",
  "typescript": "5.4.5",
  "webpack": "5.99.0",
  "@rushstack/heft": "^0.67.2"
}
```

## 📁 Project Structure

```
📦 podr/
├── 📱 src/                           # Main application source
│   ├── 🎨 ui/                        # Preact components
│   │   ├── 🧪 __tests__/             # Component tests
│   │   ├── 📱 App.tsx                # Main app shell
│   │   ├── 🔍 Search.tsx             # Podcast search
│   │   ├── 📋 List.tsx               # Podcast listings
│   │   ├── 📄 Result.tsx             # Search results
│   │   └── 🛡️ ErrorBoundary.tsx      # Error handling
│   ├── 🛠️ utils/                     # Shared utilities
│   ├── 🎯 types/                     # TypeScript type definitions
│   └── 📄 index.tsx                  # Application entry point
├── 📦 packages/                      # Reusable packages
├── 🔧 config/                        # Build configuration
├── 🌐 webpack-plugins/               # Custom webpack plugins
├── 📚 docs/                          # Documentation
└── 🧪 __mocks__/                     # Jest mocks
```

## 💡 Development Guidelines

### Code Style & Standards
- **TypeScript**: Use strict mode, prefer explicit types, leverage path aliases
- **Components**: Functional components with hooks, use Preact patterns
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Auto-organized imports, use path aliases for clean imports
- **CSS**: SCSS with BEM methodology, use CSS custom properties

### Testing Philosophy
- **High Coverage**: Target 90%+ code coverage
- **Component Focus**: Test behavior, not implementation details
- **Fast Feedback**: Sub-second test execution
- **Continuous**: Tests run on every commit

### Testing Patterns
```typescript
// Component Testing Example
import { render, screen } from '@testing-library/preact';
import { Search } from '../Search';

describe('Search Component', () => {
  it('should render search input', () => {
    render(<Search />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
});
```

## 🛠️ Common Commands

### Development
```bash
yarn start             # Start dev server with hot reload
yarn build             # Production build
yarn build:ci          # CI optimized build (no prebuild steps)
```

### Testing
```bash
yarn test              # Run full test suite
yarn test:watch        # Watch mode for development
yarn test:coverage     # Generate coverage reports
```

### Code Quality
```bash
yarn lint              # ESLint checks (via heft)
yarn format            # Prettier formatting (auto on save in dev container)
yarn type-check        # TypeScript validation (via heft build)
```

## 🌐 Environment & Runtime

### Node.js Version
- **Required**: Node.js 24+ LTS
- **Package Manager**: Yarn 1.22+ or Yarn 4+
- **Dev Container**: Automatically configured with Node.js 24

### Deployment
- **Platform**: Netlify (automated via GitHub Actions)
- **Build Command**: `yarn build:ci`
- **Publish Directory**: `dist/`
- **Node Version**: 24 (configured in netlify.toml)

## 🎨 Component Patterns

### Functional Component Template
```typescript
import { FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export const Component: FunctionComponent<ComponentProps> = ({ 
  title, 
  onAction 
}) => {
  const [state, setState] = useState<string>('');

  useEffect(() => {
    // Side effects here
  }, []);

  return (
    <div className="component">
      <h2>{title}</h2>
      {onAction && (
        <button onClick={onAction}>
          Action
        </button>
      )}
    </div>
  );
};
```

### Error Boundary Pattern
```typescript
import { Component, ComponentChildren } from 'preact';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  { children: ComponentChildren },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
```

## 🧪 Testing Guidelines

### Test File Naming
- Place tests in `__tests__/` directories alongside components
- Use `.test.tsx` suffix for test files
- Match component names: `Component.tsx` → `Component.test.tsx`

### Test Structure (AAA Pattern)
```typescript
describe('Component Name', () => {
  it('should describe expected behavior', () => {
    // Arrange
    const props = { title: 'Test' };
    
    // Act
    render(<Component {...props} />);
    
    // Assert
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### Mock External Dependencies
```typescript
// Mock fetch for API calls
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'mock' })
  })
);
```

## 🔧 Build Configuration

### Key Files
- `heft.json` - Main build configuration
- `webpack.config.js` - Webpack setup
- `jest.config.js` - Testing configuration
- `tsconfig.json` - TypeScript configuration
- `postcss.config.js` - CSS processing

### Environment Variables
- `NODE_ENV` - Environment (development/production)
- `CI` - Enables CI-specific optimizations

## 📋 Performance Considerations

### Bundle Optimization
- Tree shaking enabled for dead code elimination
- Code splitting for vendor and app chunks
- Asset compression and minification
- Preload hints for critical resources

### Development
- Hot module replacement for fast iteration
- Source maps for debugging
- Incremental TypeScript compilation

## 🚀 Deployment

### Build Process
1. TypeScript compilation
2. SCSS processing
3. Webpack bundling with optimizations
4. Asset compression
5. Static file generation

### Deployment Targets
- **Primary**: Netlify (automated via CI/CD)
- **Manual**: Any static hosting provider

## 🤝 Contributing Patterns

### Pull Request Guidelines
- Feature branches from `main`
- Conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
- All checks must pass (tests, linting, build)
- Code review required
- Small, focused changes preferred

### Commit Message Format
```
type(scope): description

feat(search): add podcast filtering functionality
fix(player): resolve audio playback issue
docs(readme): update installation instructions
test(search): add unit tests for search component
```

## 🎯 Code Generation Preferences

When generating code for this project:

1. **Use Preact patterns** instead of React (import from 'preact')
2. **Prefer TypeScript** with explicit types and interfaces
3. **Follow existing file structure** and naming conventions
4. **Include proper error handling** and loading states
5. **Write accompanying tests** for new components
6. **Use existing design patterns** found in the codebase
7. **Maintain accessibility** standards (ARIA labels, semantic HTML)
8. **Optimize for performance** (lazy loading, memoization where appropriate)

## 📚 Additional Resources

- [Contributing Guidelines](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)

## 🔐 Security & Best Practices

### Security Considerations
- All dependencies are audited via `yarn audit` in CI
- GitHub Actions workflows have minimal permissions (principle of least privilege)
- Dependabot configured for automatic security updates
- CodeQL analysis runs weekly for vulnerability detection

### Modern Enlistment Practices
- **Consistent Environment**: Dev containers ensure identical setup across contributors
- **Automated Quality Gates**: All PRs must pass tests, builds, and security checks
- **Version Pinning**: Use `--frozen-lockfile` to ensure reproducible builds
- **Fast Feedback**: Tests run in <10 seconds, builds in <10 seconds

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Branch Protection**: Main branch requires PR approval and passing checks
- **Preview Deployments**: Every PR gets a preview URL on Netlify
- **Daily Builds**: Fresh API data pulled daily for production

## 🚀 Performance Optimization

### Build Performance
- **Incremental Compilation**: TypeScript compiles only changed files
- **Webpack Caching**: Persistent cache for faster rebuilds
- **Code Splitting**: Vendor and app bundles separated
- **Tree Shaking**: Dead code elimination enabled

### Runtime Performance
- **Bundle Size**: Target <100KB gzipped for main bundle
- **Lazy Loading**: Route-based code splitting where applicable
- **Preact Signals**: Fine-grained reactivity for optimal re-renders
- **Service Worker**: Offline support and caching (configured in netlify.toml)

---

This project maintains high standards for code quality, testing, and developer experience. When contributing code or suggestions, please align with these established patterns and practices.