import { h, JSX, FunctionComponent } from 'preact';
import { useCallback, useRef } from 'preact/hooks';
import { Signal } from '@preact/signals';
import { useAnalytics } from '../utils/hooks';

/**
 * Props for the Search component.
 */
interface ISearchProps {
  /**
   * Callback to be called when the user submits the search query.
   *
   * @param query the search query
   * @returns void
   */
  onSearch: (query: string) => void;
  
  /**
   * Optional signal for controlling the input value externally
   */
  querySignal?: Signal<string>;
}

/**
 * Search component with signal support and analytics tracking.
 *
 * @param props Component props
 * @returns JSX element
 */
export const Search: FunctionComponent<ISearchProps> = ({ onSearch, querySignal }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { trackSearch } = useAnalytics();
  
  /**
   * Handle the keydown event on the search input.
   */
  const onKeyDown = useCallback((event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const query = event.currentTarget.value.trim();
      onSearch(query);
      trackSearch(query);
    }
  }, [onSearch, trackSearch]);
  
  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((event: JSX.TargetedEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inputRef.current) {
      const query = inputRef.current.value.trim();
      onSearch(query);
      trackSearch(query);
    }
  }, [onSearch, trackSearch]);
  
  /**
   * Handle input change if using signal
   */
  const handleChange = useCallback((event: JSX.TargetedEvent<HTMLInputElement>) => {
    if (querySignal) {
      querySignal.value = event.currentTarget.value;
    }
  }, [querySignal]);

  return (
    <form onSubmit={handleSubmit} role="search">
      <input
        ref={inputRef}
        className="form-control"
        type="search"
        placeholder="Search podcasts"
        aria-label="Search podcasts"
        onKeyDown={onKeyDown}
        onChange={querySignal ? handleChange : undefined}
        value={querySignal?.value}
      />
      <button 
        type="submit" 
        className="search-button"
        aria-label="Submit search"
      >
        Search
      </button>
    </form>
  );
};
