import { h, FunctionComponent, Fragment, TargetedEvent, TargetedKeyboardEvent } from 'preact';
import { useCallback, useRef, useMemo } from 'preact/hooks';
import { Signal } from '@preact/signals';
import { APP_CONFIG } from '../utils/AppContext';
import { useAnalytics } from '../utils/hooks';

/**
 * Joins a base class with the names whose flags are true.
 * Order follows the object's own key order.
 */
const joinClasses = (base: string, flags: Readonly<Record<string, boolean>>): string => {
  const active = Object.keys(flags).filter((name) => flags[name]);
  return active.length > 0 ? `${base} ${active.join(' ')}` : base;
};

/**
 * Search configuration constants
 */
const SEARCH_CONFIG = {
  PLACEHOLDER_TEXT: 'Search podcasts',
  SUBMIT_BUTTON_TEXT: 'Search',
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

    if (trimmedQuery.length < APP_CONFIG.SEARCH.MIN_QUERY_LENGTH) {
      return null;
    }

    return trimmedQuery;
  }, []);

  /**
   * Executes search with validation and analytics.
   *
   * Submitting an empty field is a request to clear the results, not a no-op -
   * previously there was no way to dismiss a set of search results.
   */
  const executeSearch = useCallback((query: string) => {
    const processedQuery = processSearchQuery(query);

    if (!processedQuery) {
      onSearch('');
      return;
    }

    onSearch(processedQuery);
    trackSearch(processedQuery);
  }, [onSearch, trackSearch, processSearchQuery]);
  
  /**
   * Handle the keydown event on the search input with better UX
   */
  const handleKeyDown = useCallback((event: TargetedKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !disabled) {
      event.preventDefault();
      executeSearch(event.currentTarget.value);
    }
  }, [executeSearch, disabled]);
  
  /**
   * Handle form submission with prevention of default behavior
   */
  const handleSubmit = useCallback((event: TargetedEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (inputRef.current && !disabled) {
      executeSearch(inputRef.current.value);
    }
  }, [executeSearch, disabled]);
  
  /**
   * Keeps an external signal in step with what the field shows.
   * The search itself runs on submit, not on each keystroke.
   * Preact core fires `input` on each keystroke. `onChange` only does that
   * when preact/compat rewrites it, which this field does not rely on.
   */
  const handleInput = useCallback((event: TargetedEvent<HTMLInputElement>) => {
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
  
  const inputClassName = joinClasses('form-control', {
    loading: isLoading,
    disabled: disabled
  });

  const buttonClassName = joinClasses('search-button', {
    loading: isLoading,
    disabled: disabled
  });

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
          onInput={querySignal ? handleInput : undefined}
          value={querySignal?.value}
          disabled={disabled}
          autoComplete="off"
          spellcheck={false}
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
        disabled={disabled}
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
