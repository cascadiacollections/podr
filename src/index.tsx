if (process.env.NODE_ENV === 'development') {
  require("preact/debug");
} else {
  require("preact/devtools");
}

import './app.scss';
import { h, render } from 'preact';

// Import modern functional component instead of class component
import { App } from './ui/AppFunctional';
import { ErrorBoundary } from './ui/ErrorBoundary';

const rootEl: HTMLElement | null = document.getElementById('root');

if (typeof window !== 'undefined' && rootEl) {
  render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
    rootEl
  );
}
