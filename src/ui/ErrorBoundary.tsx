import { Component, h, ComponentChildren } from 'preact';

import { trackEvent } from '../utils/analytics';

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

interface ErrorBoundaryState {
  /** The thrown value. Preact 11.2 passes null and undefined through instead of wrapping them. */
  error: unknown;
  hasError: boolean;
}

/**
 * Text for the details block. An Error keeps its "Error: ..." form.
 * A thrown string, null, or undefined still produces text.
 */
function errorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.toString();
  }

  if (typeof error === 'string' && error.length > 0) {
    return error;
  }

  if (error == null) {
    return 'Unknown error';
  }

  return String(error);
}

/** Short text for the analytics description. */
function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message || 'Unknown error';
  }

  if (typeof error === 'string' && error.length > 0) {
    return error;
  }

  return 'Unknown error';
}

/**
 * ErrorBoundary component to catch JavaScript errors in children components
 * and display a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  componentDidCatch(error: unknown): void {
    // Catch errors in any components below and re-render with error message
    this.setState({ error, hasError: true });

    // Same reporter as the rest of the app, so a build with analytics off
    // (or a self-hosted provider) is honored here too. A thrown null has no
    // message; reporting it must not throw again.
    trackEvent('exception', {
      description: `error_boundary_${errorMessage(error)}`,
      fatal: false
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please refresh the page to try again.</p>
          <details>
            <summary>Error Details</summary>
            <pre>{errorDetails(this.state.error)}</pre>
          </details>
        </div>
      );
    }

    // Normally, just render children
    return this.props.children;
  }
}