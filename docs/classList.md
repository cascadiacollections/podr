# classList API

An optimized library API for setting, unsetting, and toggling CSS classes on DOM element(s), built using the same flexible input patterns as the [`useClassNames` hook](./useClassNames.md).

## Overview

The classList API provides three main functions for direct DOM manipulation:
- `setClassList()` - Adds classes to element(s)
- `unsetClassList()` - Removes classes from element(s)  
- `toggleClassList()` - Toggles classes on element(s)

All functions use the same flexible input types as `useClassNames` for consistency and accept both single elements and collections of elements.

## Key Features

- 🎯 **Direct DOM Manipulation**: Directly modifies element classList properties
- 🔄 **Flexible Input Types**: Same input patterns as useClassNames (strings, objects, arrays, functions)
- 📦 **Multi-Element Support**: Works with single elements, arrays, NodeList, HTMLCollection
- ⚡ **Performance Optimized**: Reuses optimized resolution logic from useClassNames
- 🛡️ **Error Resilient**: Graceful handling of invalid inputs and edge cases
- 🧩 **Consistent API**: Follows the same patterns and conventions as useClassNames

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

## Best Practices

1. **Batch Operations**: Combine multiple class changes into single function calls
2. **Use Object Syntax**: Prefer object conditionals for readable state management
3. **Element Collections**: Leverage multi-element support for efficiency
4. **Error Handling**: The API handles errors gracefully, but validate inputs when possible
5. **Performance**: Use the API for dynamic class manipulation, not static class assignment
6. **Consistency**: Use the same input patterns as `useClassNames` for codebase consistency

---

The classList API provides a powerful, flexible, and performant way to manipulate DOM element classes while maintaining consistency with the existing `useClassNames` hook patterns.