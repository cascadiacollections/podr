import { Component, h, ComponentChildren } from 'preact';

import { trackEvent } from '../utils/analytics';

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors in children components
 * and display a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  componentDidCatch(error: Error): void {
    // Catch errors in any components below and re-render with error message
    this.setState({ error });

    // Same reporter as the rest of the app, so a build with analytics off
    // (or a self-hosted provider) is honored here too
    trackEvent('exception', {
      description: `error_boundary_${error.message}`,
      fatal: false
    });
  }

  render() {
    if (this.state.error) {
      // Fallback UI when an error occurs
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please refresh the page to try again.</p>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error.toString()}</pre>
          </details>
        </div>
      );
    }

    // Normally, just render children
    return this.props.children;
  }
}