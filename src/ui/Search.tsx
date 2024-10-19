import { h, JSX, FunctionComponent } from 'preact';
import { useCallback } from 'preact/hooks';

interface ISearchProps {
  onSearch: (query: string) => void;
}

export const Search: FunctionComponent<ISearchProps> = ({ onSearch }) => {
  const onKeyDown = useCallback((event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSearch(event.currentTarget.value.trim());
    }
  }, [onSearch]);

  return (
    <input
      class="form-control"
      type="search"
      placeholder="Search podcasts"
      onKeyDown={onKeyDown}
    />
  );
};
