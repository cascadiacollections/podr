# Enhanced JSX Props with Custom Pragma

This document demonstrates the usage of the custom JSX pragma that adds `classList` support to Preact components.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Simple Usage](#simple-usage)
- [Advanced Patterns](#advanced-patterns)
- [Real-World Examples](#real-world-examples)
- [Performance Tips](#performance-tips)
- [TypeScript Support](#typescript-support)

## Basic Setup

### Method 1: File-level pragma (Recommended)

```tsx
/** @jsx h */
import { h } from '../utils/hooks';

function MyComponent() {
  return (
    <div 
      className="base-component"
      classList={{
        'component--active': isActive,
        'component--loading': isLoading
      }}
    >
      Content
    </div>
  );
}
```

### Method 2: Global configuration

```tsx
// In your build configuration or main entry file
import { h } from './utils/hooks';

// Configure globally (affects all JSX in scope)
declare global {
  namespace JSX {
    interface ElementClass {
      render: any;
    }
  }
}

// Use without pragma comment
function MyComponent() {
  return (
    <div classList={{ 'active': isActive }}>
      Content
    </div>
  );
}
```

### Method 3: Explicit function usage

```tsx
import { createEnhancedElement, useClassList } from '../utils/hooks';

function MyComponent() {
  // Hook-based approach
  const className = useClassList(
    { 'component--active': isActive },
    'base-component'
  );
  
  return <div className={className}>Content</div>;
  
  // Or programmatic element creation
  return createEnhancedElement(
    'div',
    {
      className: 'base-component',
      classList: { 'component--active': isActive }
    },
    'Content'
  );
}
```

## Simple Usage

### String classList

```tsx
/** @jsx h */
import { h } from '../utils/hooks';

function SimpleExample() {
  return (
    <button 
      className="btn"
      classList="btn--primary"
    >
      Click me
    </button>
  );
  // Result: className="btn btn--primary"
}
```

### Object-based conditionals

```tsx
/** @jsx h */
import { h } from '../utils/hooks';

function ConditionalExample({ isActive, isDisabled, isLoading }: ComponentProps) {
  return (
    <div 
      className="component"
      classList={{
        'component--active': isActive,
        'component--disabled': isDisabled,
        'component--loading': isLoading,
        'component--ready': !isLoading && !isDisabled
      }}
    >
      Dynamic state
    </div>
  );
}
```

### Array inputs

```tsx
/** @jsx h */
import { h } from '../utils/hooks';

function ArrayExample() {
  return (
    <div 
      className="base"
      classList={[
        'utility-class',
        'responsive-class',
        someCondition && 'conditional-class'
      ]}
    >
      Array-based classes
    </div>
  );
}
```

## Advanced Patterns

### Function-based dynamic classes

```tsx
/** @jsx h */
import { h } from '../utils/hooks';

function DynamicExample({ theme, size }: ComponentProps) {
  const getDynamicClass = () => {
    return `theme--${theme} size--${size}`;
  };
  
  return (
    <div 
      className="component"
      classList={getDynamicClass}
    >
      Dynamic styling
    </div>
  );
}
```

### Mixed input patterns

```tsx
/** @jsx h */
import { h } from '../utils/hooks';

function MixedExample({ isActive, theme, utilities }: ComponentProps) {
  return (
    <div 
      className="base-component"
      classList={[
        // String classes
        'always-present',
        
        // Object conditionals
        {
          'component--active': isActive,
          'component--inactive': !isActive
        },
        
        // Function for dynamic logic
        () => `theme--${theme}`,
        
        // Array of utilities
        utilities,
        
        // Conditional string
        isActive && 'active-specific-class'
      ]}
    >
      Complex class logic
    </div>
  );
}
```

## Real-World Examples

### Modal Component

```tsx
/** @jsx h */
import { h } from '../utils/hooks';
import { useState, useEffect } from 'preact/hooks';

interface ModalProps {
  isOpen: boolean;
  size?: 'small' | 'medium' | 'large';
  onClose?: () => void;
}

function Modal({ isOpen, size = 'medium', onClose }: ModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Add no-scroll to body
      document.body.classList.add('no-scroll');
    }
    
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen]);
  
  return (
    <div 
      className="modal-overlay"
      classList={{
        'modal-overlay--open': isOpen,
        'modal-overlay--animating': isAnimating
      }}
      onClick={onClose}
    >
      <div 
        className="modal"
        classList={[
          `modal--${size}`,
          {
            'modal--open': isOpen,
            'modal--animating': isAnimating
          }
        ]}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__content">
          Modal content here
        </div>
      </div>
    </div>
  );
}
```

### Form Input with Validation

```tsx
/** @jsx h */
import { h } from '../utils/hooks';
import { useState } from 'preact/hooks';

interface InputProps {
  label: string;
  type?: string;
  required?: boolean;
  validator?: (value: string) => string | null;
}

function FormInput({ label, type = 'text', required, validator }: InputProps) {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const validateInput = (inputValue: string) => {
    if (required && !inputValue.trim()) {
      return 'This field is required';
    }
    return validator ? validator(inputValue) : null;
  };
  
  const isValid = !error && touched;
  const isInvalid = !!error && touched;
  
  return (
    <div className="form-group">
      <label 
        className="form-label"
        classList={{
          'form-label--required': required,
          'form-label--error': isInvalid
        }}
      >
        {label}
        {required && <span className="required-asterisk">*</span>}
      </label>
      
      <input
        type={type}
        className="form-control"
        classList={{
          'form-control--valid': isValid,
          'form-control--invalid': isInvalid,
          'form-control--touched': touched
        }}
        value={value}
        onInput={(e) => {
          const newValue = (e.target as HTMLInputElement).value;
          setValue(newValue);
          setError(validateInput(newValue));
        }}
        onBlur={() => setTouched(true)}
      />
      
      {error && (
        <div 
          className="form-error"
          classList="form-error--visible"
        >
          {error}
        </div>
      )}
    </div>
  );
}
```

### Navigation Component

```tsx
/** @jsx h */
import { h } from '../utils/hooks';

interface NavItem {
  id: string;
  label: string;
  href: string;
  badge?: number;
  disabled?: boolean;
}

interface NavigationProps {
  items: NavItem[];
  activeItemId: string;
  orientation?: 'horizontal' | 'vertical';
}

function Navigation({ items, activeItemId, orientation = 'horizontal' }: NavigationProps) {
  return (
    <nav 
      className="navigation"
      classList={`navigation--${orientation}`}
    >
      <ul className="navigation__list">
        {items.map((item) => (
          <li 
            key={item.id}
            className="navigation__item"
            classList={{
              'navigation__item--active': item.id === activeItemId,
              'navigation__item--disabled': item.disabled,
              'navigation__item--has-badge': !!item.badge
            }}
          >
            <a 
              href={item.disabled ? undefined : item.href}
              className="navigation__link"
              classList={{
                'navigation__link--active': item.id === activeItemId,
                'navigation__link--disabled': item.disabled
              }}
            >
              {item.label}
              {item.badge && (
                <span 
                  className="navigation__badge"
                  classList={{
                    'navigation__badge--high': item.badge > 10,
                    'navigation__badge--medium': item.badge > 5 && item.badge <= 10,
                    'navigation__badge--low': item.badge <= 5
                  }}
                >
                  {item.badge}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

## Performance Tips

### Memoization for Complex Logic

```tsx
/** @jsx h */
import { h } from '../utils/hooks';
import { useMemo } from 'preact/hooks';

function PerformantComponent({ data, theme, size }: ComponentProps) {
  // Memoize complex classList logic
  const classList = useMemo(() => ({
    [`theme--${theme}`]: true,
    [`size--${size}`]: true,
    'has-data': data.length > 0,
    'is-large-dataset': data.length > 1000
  }), [theme, size, data.length]);
  
  return (
    <div 
      className="component"
      classList={classList}
    >
      Optimized rendering
    </div>
  );
}
```

### Using the useClassList Hook

```tsx
import { useClassList } from '../utils/hooks';

function HookBasedComponent({ isActive, theme }: ComponentProps) {
  // Use the hook for better performance in some scenarios
  const className = useClassList(
    {
      'component--active': isActive,
      [`component--${theme}`]: theme
    },
    'base-component'
  );
  
  return <div className={className}>Hook-based approach</div>;
}
```

## TypeScript Support

The custom pragma includes full TypeScript support with the enhanced JSX interface:

```tsx
/** @jsx h */
import { h } from '../utils/hooks';

// TypeScript will provide intellisense for classList
interface ComponentProps {
  isActive: boolean;
  theme: 'light' | 'dark';
  size: 'small' | 'medium' | 'large';
}

function TypeSafeComponent({ isActive, theme, size }: ComponentProps) {
  return (
    <div 
      className="component"
      classList={{
        'component--active': isActive,      // ✅ Type safe
        [`component--${theme}`]: true,      // ✅ Type safe
        [`component--${size}`]: true,       // ✅ Type safe
        'invalid-property': undefined       // ✅ Handles undefined gracefully
      }}
    >
      Fully type-safe classList usage
    </div>
  );
}
```

## Migration Guide

### From Manual className Concatenation

**Before:**
```tsx
function Component({ isActive, isDisabled }) {
  const className = [
    'component',
    isActive && 'component--active',
    isDisabled && 'component--disabled'
  ].filter(Boolean).join(' ');
  
  return <div className={className}>Content</div>;
}
```

**After:**
```tsx
/** @jsx h */
import { h } from '../utils/hooks';

function Component({ isActive, isDisabled }) {
  return (
    <div 
      className="component"
      classList={{
        'component--active': isActive,
        'component--disabled': isDisabled
      }}
    >
      Content
    </div>
  );
}
```

### From clsx/classnames Libraries

**Before:**
```tsx
import clsx from 'clsx';

function Component({ isActive, theme }) {
  return (
    <div className={clsx('component', {
      'component--active': isActive,
      [`component--${theme}`]: theme
    })}>
      Content
    </div>
  );
}
```

**After:**
```tsx
/** @jsx h */
import { h } from '../utils/hooks';

function Component({ isActive, theme }) {
  return (
    <div 
      className="component"
      classList={{
        'component--active': isActive,
        [`component--${theme}`]: theme
      }}
    >
      Content
    </div>
  );
}
```

## Browser Compatibility

The custom JSX pragma works in all environments that support Preact, including:

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ React Native (with Preact/compat)
- ✅ Server-side rendering
- ✅ Static site generation
- ✅ All bundlers (Webpack, Rollup, Vite, etc.)

## Conclusion

The enhanced JSX props with custom pragma provide a powerful, type-safe, and performant way to handle dynamic CSS classes in Preact applications. By using the same optimized logic as `useClassNames`, it ensures consistency across your application while providing a more declarative and JSX-native API.