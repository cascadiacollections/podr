import { Component, h, ComponentChildren, ErrorInfo } from 'preact';

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: ComponentChildren;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component to catch JavaScript errors in children components
 * and display a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: `error_boundary_${error.message}`,
        fatal: false
      });
    }

    private handleReset = () => {
      this.setState({ error: null, errorInfo: null });
    };
  }

  render() {
    if (this.state.error) {
      // Fallback UI when an error occurs
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please refresh the page to try again.</p>
          <button type="button" onClick={this.handleReset}>Try again</button>
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