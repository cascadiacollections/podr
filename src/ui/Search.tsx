import { h, JSX, FunctionComponent } from 'preact';

interface ISearchProps {
  onSearch: (query: string) => void;
}

export const Search: FunctionComponent<ISearchProps> = (props: ISearchProps) => {
  const { onSearch } = props;

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const target: HTMLInputElement = e?.target as HTMLInputElement;
      const query: string = target.value || '';
      const trimmedQuery: string = query.trim();

      if (trimmedQuery) {
        onSearch(trimmedQuery);
      }
    }
  }

  return <input class='form-control' type='search' placeholder='Search podcasts' onKeyDown={onKeyDown} />
}
