# classList API

An optimized library API for setting, unsetting, and toggling CSS classes on DOM element(s), featuring both **imperative** and **Preact idiomatic declarative** APIs. Built using the same flexible input patterns as the [`useClassNames` hook](./useClassNames.md).

## Overview

The classList API provides two complementary approaches for CSS class management:

### Imperative APIs
Direct DOM manipulation functions for immediate control:
- `setClassList()` - Adds classes to element(s)
- `unsetClassList()` - Removes classes from element(s)  
- `toggleClassList()` - Toggles classes on element(s)

### Preact Idiomatic Declarative APIs
Hooks that integrate with Preact's component lifecycle:
- `useClassListSelector()` - Manage classes via CSS selectors
- `useElementClassList()` - Manage classes on ref'd elements
- `useConditionalClassList()` - Fine-grained conditional class management
- `useToggleClassListSelector()` - Declarative toggling via selectors

All functions and hooks use the same flexible input types as `useClassNames` for consistency.

## Key Features

- 🎯 **Direct DOM Manipulation**: Imperative functions for immediate control
- ⚛️ **Preact Integration**: Declarative hooks with lifecycle management
- 🔄 **Flexible Input Types**: Same input patterns as useClassNames (strings, objects, arrays, functions)
- 📦 **Multi-Element Support**: Works with single elements, arrays, NodeList, HTMLCollection
- ⚡ **Performance Optimized**: Reuses optimized resolution logic from useClassNames
- 🛡️ **Error Resilient**: Graceful handling of invalid inputs and edge cases
- 🧩 **Consistent API**: Follows the same patterns and conventions as useClassNames
- 🔄 **Automatic Cleanup**: Declarative hooks handle cleanup on unmount

## API Reference

### `setClassList(elements, ...inputs)`

Adds the specified classes to the classList of the target element(s).

**Parameters:**
- `elements: ElementCollection` - Single element or collection of elements to modify
- `...inputs: ClassNameInput[]` - Variable arguments of class name inputs

**Example:**
```typescript
import { setClassList } from './utils/hooks';

// Single element with various input types
const button = document.querySelector('.button');
setClassList(button, 'btn', 'btn--primary');
setClassList(button, { 'btn--active': isActive, 'btn--disabled': disabled });
setClassList(button, ['utility', 'classes'], () => dynamic ? 'dynamic' : null);

// Multiple elements
const buttons = document.querySelectorAll('.button');
setClassList(buttons, 'btn--hover');
```

### `unsetClassList(elements, ...inputs)`

Removes the specified classes from the classList of the target element(s).

**Parameters:**
- `elements: ElementCollection` - Single element or collection of elements to modify
- `...inputs: ClassNameInput[]` - Variable arguments of class name inputs

**Example:**
```typescript
// Remove classes from single element
setClassList(button, 'btn--active', 'btn--focus');
unsetClassList(button, { 'btn--disabled': wasDisabled, 'btn--loading': wasLoading });

// Remove classes from multiple elements
const cards = document.querySelectorAll('.card');
unsetClassList(cards, 'card--highlighted');
```

### `toggleClassList(elements, ...inputs)`

Toggles the specified classes on the classList of the target element(s).

**Parameters:**
- `elements: ElementCollection` - Single element or collection of elements to modify
- `...inputs: ClassNameInput[]` - Variable arguments of class name inputs

**Example:**
```typescript
// Toggle classes on single element
const modal = document.querySelector('.modal');
toggleClassList(modal, 'modal--open');
toggleClassList(button, { 'btn--active': shouldToggleActive });

// Toggle classes on multiple elements
const items = document.querySelectorAll('.nav-item');
toggleClassList(items, 'nav-item--selected');
```

## Input Types

The classList API uses the same flexible input types as `useClassNames`:

### String Inputs
```typescript
setClassList(element, 'class1', 'class2', 'class3');
```

### Object-Based Conditionals
```typescript
setClassList(element, 'base', {
  'component--active': isActive,
  'component--disabled': isDisabled,
  'component--loading': isLoading
});
```

### Array Inputs
```typescript
setClassList(element, ['utility', 'responsive'], 'additional');
```

### Function Inputs
```typescript
setClassList(element, 'base', () => dynamic ? 'dynamic-class' : null);
```

### Mixed Inputs
```typescript
setClassList(
  element,
  'base',
  ['utility', 'responsive'],
  { conditional: isActive },
  () => getDynamicClass(),
  123
);
```

## Element Collection Types

The API works with various element collection types:

### Single Element
```typescript
const element = document.querySelector('.target');
setClassList(element, 'new-class');
```

### Element Array
```typescript
const elements = [element1, element2, element3];
setClassList(elements, 'shared-class');
```

### NodeList
```typescript
const nodeList = document.querySelectorAll('.items');
setClassList(nodeList, 'item-class');
```

### HTMLCollection
```typescript
const collection = document.getElementsByClassName('items');
setClassList(collection, 'item-class');
```

## Real-World Examples

### Interactive Button States
```typescript
function updateButtonState(button: Element, isLoading: boolean, isDisabled: boolean) {
  // Remove previous states
  unsetClassList(button, 'btn--loading', 'btn--disabled', 'btn--ready');
  
  // Set current state
  setClassList(button, {
    'btn--loading': isLoading,
    'btn--disabled': isDisabled,
    'btn--ready': !isLoading && !isDisabled
  });
}
```

### Modal Management
```typescript
function showModal(modal: Element) {
  setClassList(modal, 'modal--open');
  setClassList(document.body, 'no-scroll');
}

function hideModal(modal: Element) {
  unsetClassList(modal, 'modal--open');
  unsetClassList(document.body, 'no-scroll');
}

function toggleModal(modal: Element) {
  toggleClassList(modal, 'modal--open');
  toggleClassList(document.body, 'no-scroll');
}
```

### Form Validation
```typescript
function updateFieldValidation(field: Element, isValid: boolean, hasError: boolean) {
  setClassList(field, 'form-field', {
    'form-field--valid': isValid,
    'form-field--error': hasError,
    'form-field--pending': !isValid && !hasError
  });
}

// Batch update multiple fields
function updateFormValidation(fields: NodeList, validationStates: boolean[]) {
  Array.from(fields).forEach((field, index) => {
    const isValid = validationStates[index];
    updateFieldValidation(field, isValid, !isValid);
  });
}
```

### Navigation State Management
```typescript
function setActiveNavItem(items: NodeList, activeIndex: number) {
  // Remove active state from all items
  unsetClassList(items, 'nav-item--active');
  
  // Set active state on specific item
  const activeItem = items[activeIndex];
  if (activeItem) {
    setClassList(activeItem, 'nav-item--active');
  }
}

function toggleMobileMenu(menuItems: NodeList, isOpen: boolean) {
  setClassList(menuItems, {
    'nav-item--mobile-visible': isOpen,
    'nav-item--mobile-hidden': !isOpen
  });
}
```

### Theme Management
```typescript
function applyTheme(elements: Element[], theme: 'light' | 'dark') {
  // Remove all theme classes
  unsetClassList(elements, 'theme-light', 'theme-dark');
  
  // Apply new theme
  setClassList(elements, `theme-${theme}`);
}

function toggleTheme(elements: Element[]) {
  toggleClassList(elements, 'theme-dark', 'theme-light');
}
```

## Performance Considerations

### Optimizations
- **Reused Logic**: Uses the same optimized resolution functions as `useClassNames`
- **Fast Paths**: Early returns for empty inputs and element collections
- **Efficient Iteration**: Minimal loops and memory allocations
- **Deduplication**: Automatic class name deduplication using Set
- **Error Boundaries**: Silent failure for function errors to maintain performance

### Performance Tips
```typescript
// ✅ Efficient: Batch operations
setClassList(elements, 'class1', 'class2', 'class3');

// ❌ Less efficient: Individual operations
setClassList(elements, 'class1');
setClassList(elements, 'class2');
setClassList(elements, 'class3');

// ✅ Efficient: Use object conditionals for multiple conditions
setClassList(element, {
  'state--loading': isLoading,
  'state--error': hasError,
  'state--success': isSuccess
});

// ❌ Less efficient: Multiple function calls
if (isLoading) setClassList(element, 'state--loading');
if (hasError) setClassList(element, 'state--error');
if (isSuccess) setClassList(element, 'state--success');
```

## Error Handling

The classList API is designed to be resilient:

### Graceful Failures
```typescript
// These all handle errors gracefully without throwing
setClassList(null, 'class');              // No-op
setClassList([], 'class');                // No-op
setClassList(element);                    // No-op (no classes)
setClassList(element, null, undefined);   // No-op (no valid classes)

// Function errors are caught and ignored
setClassList(element, () => {
  throw new Error('Something went wrong');
  return 'never-reached';
}); // Silent failure, no classes added
```

### Defensive Programming
```typescript
function safeClassListOperation(elements: unknown, classes: unknown[]) {
  try {
    // Type checking and validation would happen here
    if (elements && classes.length > 0) {
      setClassList(elements as Element, ...classes);
    }
  } catch (error) {
    console.warn('classList operation failed:', error);
  }
}
```

## Migration from Manual classList Operations

### Before: Manual classList manipulation
```typescript
// Manual approach
function updateButtonState(button: Element, isActive: boolean, isDisabled: boolean) {
  button.classList.remove('btn--active', 'btn--disabled');
  if (isActive) button.classList.add('btn--active');
  if (isDisabled) button.classList.add('btn--disabled');
}

// Multiple elements
const buttons = document.querySelectorAll('.button');
buttons.forEach(button => {
  button.classList.add('btn--hover');
});
```

### After: classList API
```typescript
// Using classList API
function updateButtonState(button: Element, isActive: boolean, isDisabled: boolean) {
  unsetClassList(button, 'btn--active', 'btn--disabled');
  setClassList(button, {
    'btn--active': isActive,
    'btn--disabled': isDisabled
  });
}

// Multiple elements
const buttons = document.querySelectorAll('.button');
setClassList(buttons, 'btn--hover');
```

## Type Safety

The classList API maintains full TypeScript support:

```typescript
// Type-safe element collections
const elements: Element[] = Array.from(document.querySelectorAll('.item'));
const nodeList: NodeList = document.querySelectorAll('.item');
const collection: HTMLCollection = document.getElementsByClassName('item');

// All work with the same API
setClassList(elements, 'class');
setClassList(nodeList, 'class');
setClassList(collection, 'class');

// Type-safe input handling
const conditionalClasses: Record<string, boolean> = {
  'active': true,
  'disabled': false
};

setClassList(element, 'base', conditionalClasses);
```

## Browser Compatibility

The classList API uses standard DOM APIs:
- `Element.classList.add()`
- `Element.classList.remove()`
- `Element.classList.toggle()`

These are supported in all modern browsers and IE10+.

## Preact Idiomatic Declarative APIs

In addition to the imperative functions above, the classList API provides Preact-specific hooks that integrate seamlessly with component lifecycle management.

### `useClassListSelector(selector, inputs, container?)`

Declaratively manages CSS classes on elements matching a CSS selector.

**Parameters:**
- `selector: string` - CSS selector string (e.g., '.button', '#modal', '[data-active]')
- `inputs: ClassNameInput[]` - Array of class name inputs (same as useClassNames)
- `container?: Element | Document` - Optional container to scope the selector (defaults to document)

**Example:**
```tsx
function NavComponent({ activeIndex }: { activeIndex: number }) {
  // Reset all nav items
  useClassListSelector('.nav-item', [{ 'nav-item--active': false }]);
  
  // Set active item
  useClassListSelector(`[data-nav-index="${activeIndex}"]`, ['nav-item--active']);
  
  // Apply loading state to all buttons
  useClassListSelector('.btn', [{ 'btn--loading': isLoading }]);
  
  return <nav>...</nav>;
}
```

### `useElementClassList(elementRef, inputs)`

Declaratively manages CSS classes on a single element accessed via Preact ref.

**Parameters:**
- `elementRef: RefObject<Element>` - Preact ref to the target element
- `inputs: ClassNameInput[]` - Array of class name inputs

**Example:**
```tsx
function ButtonComponent({ isLoading, variant }: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Declaratively manage button classes based on props
  useElementClassList(buttonRef, [
    'btn',
    `btn--${variant}`,
    { 'btn--loading': isLoading, 'btn--disabled': isLoading }
  ]);
  
  return <button ref={buttonRef}>Click me</button>;
}
```

### `useConditionalClassList(elementRef, conditions)`

Provides fine-grained conditional management of individual CSS classes.

**Parameters:**
- `elementRef: RefObject<Element>` - Preact ref to the target element
- `conditions: Record<string, boolean>` - Object mapping class names to boolean conditions

**Example:**
```tsx
function ModalComponent({ isOpen, isLoading }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Conditionally manage specific classes
  useConditionalClassList(modalRef, {
    'modal--open': isOpen,
    'modal--loading': isLoading,
    'modal--has-backdrop': isOpen && !isLoading
  });
  
  return <div ref={modalRef} className="modal">...</div>;
}
```

### `useToggleClassListSelector(selector, inputs, container?, trigger?)`

Declaratively toggles classes on elements matching a selector when trigger changes.

**Parameters:**
- `selector: string` - CSS selector string
- `inputs: ClassNameInput[]` - Array of class name inputs to toggle
- `container?: Element | Document` - Optional container to scope the selector
- `trigger?: unknown` - Dependency that triggers the toggle

**Example:**
```tsx
function ThemeToggle({ isDark }: { isDark: boolean }) {
  // Toggle dark theme classes on all theme-aware elements
  useToggleClassListSelector('.theme-aware', ['dark-mode'], document.body, isDark);
  
  return <button>Toggle Theme</button>;
}
```

## Preact Integration Examples

### Real-World Modal Management
```tsx
function Modal({ isOpen, isLoading, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Manage modal state
  useConditionalClassList(modalRef, {
    'modal--open': isOpen,
    'modal--loading': isLoading,
    'modal--ready': isOpen && !isLoading
  });
  
  // Manage body scroll when modal is open
  useClassListSelector('body', [{ 'no-scroll': isOpen }]);
  
  return (
    <div ref={modalRef} className="modal">
      {children}
    </div>
  );
}
```

### Navigation with Dynamic Active States
```tsx
function Navigation({ items, activeIndex }: NavigationProps) {
  // Reset all items first
  useClassListSelector('.nav-item', [{ 'nav-item--active': false }]);
  
  // Set active item
  useClassListSelector(`[data-index="${activeIndex}"]`, ['nav-item--active']);
  
  return (
    <nav>
      {items.map((item, index) => (
        <a key={item.id} className="nav-item" data-index={index}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
```

### Form Field Validation
```tsx
function FormField({ value, error, isValidating }: FormFieldProps) {
  const fieldRef = useRef<HTMLInputElement>(null);
  
  useConditionalClassList(fieldRef, {
    'field--valid': !error && value,
    'field--error': !!error,
    'field--validating': isValidating,
    'field--empty': !value
  });
  
  return (
    <div>
      <input ref={fieldRef} className="form-field" value={value} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

## Hook Benefits

### Automatic Lifecycle Management
- **Mount**: Classes are applied when component mounts
- **Update**: Classes update when dependencies change
- **Unmount**: Classes are automatically cleaned up

### Performance Optimized
- **Minimal Re-renders**: Efficient dependency tracking
- **Batch Updates**: Multiple class changes in single DOM operations
- **Memory Efficient**: Automatic cleanup prevents memory leaks

### Type Safety
- **Full TypeScript Support**: All hooks are fully typed
- **Ref Safety**: Handles null refs gracefully
- **Input Validation**: Same robust input handling as useClassNames

## Best Practices

1. **Choose the Right Hook**: 
   - Use `useElementClassList` for single elements with complex class logic
   - Use `useConditionalClassList` for fine-grained control over individual classes
   - Use `useClassListSelector` for managing multiple elements via selectors
   - Use `useToggleClassListSelector` for simple toggle behaviors

2. **Dependency Management**:
   - Hooks automatically track changes to inputs
   - Avoid creating new objects/arrays on every render
   - Use useMemo for complex computed class inputs

3. **Cleanup**: Hooks handle cleanup automatically, but be mindful of selector scope

4. **Performance**: Prefer object-based conditionals over multiple hook calls

## Best Practices

### Imperative API
1. **Batch Operations**: Combine multiple class changes into single function calls
2. **Use Object Syntax**: Prefer object conditionals for readable state management
3. **Element Collections**: Leverage multi-element support for efficiency
4. **Error Handling**: The API handles errors gracefully, but validate inputs when possible
5. **Performance**: Use the API for dynamic class manipulation, not static class assignment
6. **Consistency**: Use the same input patterns as `useClassNames` for codebase consistency

### Declarative Hooks
1. **Choose the Right Hook**: 
   - Use `useElementClassList` for single elements with complex class logic
   - Use `useConditionalClassList` for fine-grained control over individual classes
   - Use `useClassListSelector` for managing multiple elements via selectors
   - Use `useToggleClassListSelector` for simple toggle behaviors

2. **Dependency Management**:
   - Hooks automatically track changes to inputs
   - Avoid creating new objects/arrays on every render
   - Use useMemo for complex computed class inputs

3. **Cleanup**: Hooks handle cleanup automatically, but be mindful of selector scope

4. **Performance**: Prefer object-based conditionals over multiple hook calls

---

The classList API provides both **imperative functions for direct control** and **Preact idiomatic hooks for declarative component integration**, offering a comprehensive solution for CSS class manipulation while maintaining consistency with the existing `useClassNames` hook patterns.