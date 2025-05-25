import { h, JSX, FunctionComponent } from 'preact';
import { useCallback } from 'preact/hooks';

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
}

/**
 * Search component.
 *
 * @param onSearch
 * @returns h.JSX.HTMLAttributes<HTMLInputElement>
 */
export const Search: FunctionComponent<ISearchProps> = ({ onSearch }) => {
  /**
   * Handle the keydown event on the search input.
   */
  const onKeyDown = useCallback((event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSearch(event.currentTarget.value.trim());
    }
  }, [onSearch]);

  return (
    <input
      className="form-control"
      type="search"
      placeholder="Search podcasts"
      onKeyDown={onKeyDown}
    />
  );
};
