// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock global objects needed in tests
global.window = global;
global.window.scrollTo = jest.fn();
global.window.gtag = jest.fn();

// Setup localStorage mock for tests
const localStorageMock = (function () {
  let store = {};

  return {
    getItem: jest.fn((key) => {
      return store[key] || null;
    }),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getAll: () => store
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
// The app keeps the open podcast in history.state and the URL, which jsdom
// shares across every test in a file. Without a reset, one test opening a podcast would start
// the next one inside it.
beforeEach(() => {
  window.history.replaceState(null, '', '/');
});
