// Must stay the first import: installs preact/debug (dev) or preact/devtools
// (production) before any component module loads. See docs/DEBUGGING.md.
import './utils/debug';
import './app.scss';
import { h, JSX, render } from 'preact';

// Import modern functional component instead of class component
import { App } from './ui/AppFunctional';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { NotFound } from './ui/NotFound';
import { PrivacyPolicy } from './ui/PrivacyPolicy';
import { resolvePage } from './ui/routes';
import { registerServiceWorker, unregisterServiceWorker } from './utils/registerSW';

const rootEl: HTMLElement | null = document.getElementById('root');

/**
 * `/` (including `/?feed=` podcast links) and `/privacy` are real documents.
 * Any other path is the 404 document. Replacing #root keeps the prerendered
 * text for crawlers that do not run this script.
 */
const Page = (): JSX.Element => {
  const page = resolvePage(window.location.pathname);

  if (page === 'privacy') {
    return <PrivacyPolicy />;
  }

  if (page === 'not-found') {
    return <NotFound />;
  }

  return <App />;
};

if (typeof window !== 'undefined' && rootEl) {
  render(
    <ErrorBoundary>
      <Page />
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
