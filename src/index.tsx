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
import { registerServiceWorker, unregisterServiceWorker } from './utils/registerSW';

const rootEl: HTMLElement | null = document.getElementById('root');

if (typeof window !== 'undefined' && rootEl) {
  render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
    rootEl
  );

  // Offline support in production only; a cached shell would mask local changes
  if (process.env.NODE_ENV === 'development') {
    void unregisterServiceWorker();
  } else {
    void registerServiceWorker();
  }
}
