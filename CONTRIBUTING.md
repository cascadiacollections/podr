# 🤝 Contributing to Podr

Thank you for your interest in contributing to Podr! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 24+ LTS (recommended)
- **Yarn**: Version 1.22+ or 4+
- **Git**: Version 2.0+
- **GitHub Account**: For submitting pull requests

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/podr.git
cd podr
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/cascadiacollections/podr.git
```

## 💻 Development Setup

### Install Dependencies

```bash
# Install all dependencies
yarn install

# Verify installation
yarn test
yarn build:ci
```

### Start Development Server

```bash
# Start the dev server with hot reload
yarn start

# Open http://localhost:9000 in your browser
```

### Development Container (Optional)

For a consistent development environment, use the dev container:

```bash
# In VS Code, press F1 and select:
# "Dev Containers: Reopen in Container"
```

## 🔧 Making Changes

### Create a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### Development Workflow

1. **Make your changes** - Edit files in `src/`
2. **Test continuously** - Run `yarn test:watch` during development
3. **Check code quality** - Run linting before committing
4. **Build locally** - Verify production build works

```bash
# Run tests in watch mode
yarn test:watch

# Check code coverage
yarn test:coverage

# Build for production
yarn build:ci
```

## 📤 Submitting Changes

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**

```bash
git commit -m "feat(search): add fuzzy search functionality"
git commit -m "fix(player): resolve audio playback issue on Safari"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(search): add unit tests for search component"
```

### Create a Pull Request

1. Push your changes to your fork:

```bash
git push origin feature/your-feature-name
```

2. Open a pull request on GitHub:
   - Go to the [Podr repository](https://github.com/cascadiacollections/podr)
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template with details

3. Wait for review and address feedback

### Pull Request Guidelines

- ✅ **Keep PRs focused** - One feature/fix per PR
- ✅ **Write clear descriptions** - Explain what and why
- ✅ **Include tests** - Maintain 90%+ coverage
- ✅ **Update documentation** - Keep docs in sync
- ✅ **Pass all checks** - Tests, linting, build must pass
- ✅ **Small, incremental changes** - Easier to review

## 🎨 Code Style

### TypeScript Guidelines

- Use **strict mode** with explicit types
- Prefer **interfaces** over types for object shapes
- Use **PascalCase** for components, **camelCase** for functions
- Leverage **path aliases** for clean imports

```typescript
// Good ✅
import { Search } from '@/ui/Search';
import { useDebounce } from '@/utils/hooks';

// Avoid ❌
import { Search } from '../../../ui/Search';
```

### Component Structure

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

### CSS/SCSS Guidelines

- Use **BEM methodology** for class names
- Leverage **CSS custom properties** for theming
- Keep selectors **simple and specific**
- Use **mobile-first** responsive design

```scss
// Good ✅
.search-form {
  &__input {
    // Styles
  }
  
  &__button {
    // Styles
  }
}

// Avoid ❌
div.search form input[type="text"] {
  // Too specific
}
```

## 🧪 Testing

### Test Requirements

- All new features **must include tests**
- Maintain **90%+ code coverage**
- Test **behavior, not implementation**
- Use **descriptive test names**

### Writing Tests

```typescript
import { render, screen } from '@testing-library/preact';
import { Search } from '../Search';

describe('Search Component', () => {
  it('should render search input', () => {
    // Arrange
    const props = { placeholder: 'Search podcasts' };
    
    // Act
    render(<Search {...props} />);
    
    // Assert
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search podcasts')).toBeInTheDocument();
  });

  it('should call onSearch when form is submitted', () => {
    // Arrange
    const onSearch = jest.fn();
    render(<Search onSearch={onSearch} />);
    
    // Act
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(screen.getByRole('form'));
    
    // Assert
    expect(onSearch).toHaveBeenCalledWith('test');
  });
});
```

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run specific test file
yarn test Search.test.tsx

# Run tests matching pattern
yarn test --testNamePattern="search"
```

## 📚 Documentation

### Documentation Requirements

- Update **README.md** for user-facing changes
- Update **inline comments** for complex logic
- Update **component props** documentation
- Update **CHANGELOG.md** for releases

### Documentation Style

```typescript
/**
 * Searches for podcasts matching the query
 * 
 * @param query - Search term to filter podcasts
 * @param options - Optional search configuration
 * @returns Array of matching podcast results
 * 
 * @example
 * ```typescript
 * const results = await searchPodcasts('javascript', { limit: 10 });
 * ```
 */
export async function searchPodcasts(
  query: string,
  options?: SearchOptions
): Promise<Podcast[]> {
  // Implementation
}
```

## 🏆 Recognition

Contributors will be recognized in:
- GitHub contributor list
- Release notes (for significant contributions)
- Project documentation

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/cascadiacollections/podr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cascadiacollections/podr/discussions)
- **Documentation**: [Project Wiki](https://github.com/cascadiacollections/podr/wiki)

## 📄 License

By contributing to Podr, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

**Thank you for contributing to Podr! 🎉**
