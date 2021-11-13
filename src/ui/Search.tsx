import { h, FunctionComponent } from 'preact';

interface ISearchProps {
  onSearch: (query: string) => void;
}

export const Search: FunctionComponent<ISearchProps> = (props: ISearchProps) => {
  const { onSearch } = props;
  const onKeyDown = (e: any) => {
    if (e.key === 'Enter') {
      onSearch(e.target.value);
    }
  }

  return <input class='form-control' type='search' placeholder='Search podcasts' onKeyDown={onKeyDown} />
}
