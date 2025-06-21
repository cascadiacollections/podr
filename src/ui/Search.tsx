import { h, JSX, FunctionComponent, Fragment } from 'preact';
import { useCallback, useRef, useMemo } from 'preact/hooks';
import { Signal } from '@preact/signals';
import { useAnalytics } from '../utils/hooks';

/**
 * Search configuration constants
 */
const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 1,
  PLACEHOLDER_TEXT: 'Search podcasts',
  SUBMIT_BUTTON_TEXT: 'Search',
  SEARCH_DEBOUNCE_MS: 300,
} as const;

/**
 * Props for the Search component with enhanced type safety
 */
export interface ISearchProps {
  /**
   * Callback to be called when the user submits the search query
   * @param query - The search query (trimmed and validated)
   */
  readonly onSearch: (query: string) => void;
  
  /**
   * Optional signal for controlling the input value externally
   */
  readonly querySignal?: Signal<string>;
  
  /**
   * Optional placeholder text override
   */
  readonly placeholder?: string;
  
  /**
   * Whether the search is currently loading
   */
  readonly isLoading?: boolean;
  
  /**
   * Whether the search input should be disabled
   */
  readonly disabled?: boolean;
}

/**
 * Search component with signal support, analytics tracking, and performance optimizations
 * @param props - Component props
 * @returns JSX element
 */
export const Search: FunctionComponent<ISearchProps> = ({
  onSearch,
  querySignal,
  placeholder = SEARCH_CONFIG.PLACEHOLDER_TEXT,
  isLoading = false,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { trackSearch } = useAnalytics();
  
  /**
   * Validates and processes search query
   */
  const processSearchQuery = useCallback((query: string): string | null => {
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      return null;
    }
    
    return trimmedQuery;
  }, []);
  
  /**
   * Executes search with validation and analytics
   */
  const executeSearch = useCallback((query: string) => {
    const processedQuery = processSearchQuery(query);
    
    if (processedQuery) {
      onSearch(processedQuery);
      trackSearch(processedQuery);
    }
  }, [onSearch, trackSearch, processSearchQuery]);
  
  /**
   * Handle the keydown event on the search input with better UX
   */
  const handleKeyDown = useCallback((event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !disabled && !isLoading) {
      event.preventDefault();
      executeSearch(event.currentTarget.value);
    }
  }, [executeSearch, disabled, isLoading]);
  
  /**
   * Handle form submission with prevention of default behavior
   */
  const handleSubmit = useCallback((event: JSX.TargetedEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (inputRef.current && !disabled && !isLoading) {
      executeSearch(inputRef.current.value);
    }
  }, [executeSearch, disabled, isLoading]);
  
  /**
   * Handle input change if using signal with debouncing consideration
   */
  const handleChange = useCallback((event: JSX.TargetedEvent<HTMLInputElement>) => {
    if (querySignal && !disabled) {
      querySignal.value = event.currentTarget.value;
    }
  }, [querySignal, disabled]);
  
  /**
   * Memoized aria labels for accessibility
   */
  const searchInputAriaLabel = useMemo(() => 
    `${placeholder}${isLoading ? ' (searching...)' : ''}`,
    [placeholder, isLoading]
  );
  
  const submitButtonAriaLabel = useMemo(() => 
    `${SEARCH_CONFIG.SUBMIT_BUTTON_TEXT}${isLoading ? ' (loading...)' : ''}`,
    [isLoading]
  );
  
  /**
   * Memoized CSS classes for performance
   */
  const inputClassName = useMemo(() => 
    `form-control${isLoading ? ' loading' : ''}${disabled ? ' disabled' : ''}`,
    [isLoading, disabled]
  );
  
  const buttonClassName = useMemo(() => 
    `search-button${isLoading ? ' loading' : ''}${disabled ? ' disabled' : ''}`,
    [isLoading, disabled]
  );

  return (
    <form onSubmit={handleSubmit} role="search" className="search-form">
      <div className="search-input-container">
        <input
          ref={inputRef}
          className={inputClassName}
          type="search"
          placeholder={placeholder}
          aria-label={searchInputAriaLabel}
          onKeyDown={handleKeyDown}
          onChange={querySignal ? handleChange : undefined}
          value={querySignal?.value}
          disabled={disabled || isLoading}
          autoComplete="off"
          spellCheck={false}
        />
        {isLoading && (
          <div className="search-loading-indicator" aria-hidden="true">
            <span className="loading-spinner" />
          </div>
        )}
      </div>
      <button 
        type="submit" 
        className={buttonClassName}
        aria-label={submitButtonAriaLabel}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <Fragment>
            <span className="loading-spinner" aria-hidden="true" />
            <span className="sr-only">Searching...</span>
          </Fragment>
        ) : (
          SEARCH_CONFIG.SUBMIT_BUTTON_TEXT
        )}
      </button>
    </form>
  );
};
