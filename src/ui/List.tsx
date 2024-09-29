import { FunctionComponent, h } from "preact";
import { IFeedItem } from "./Result";
import { Result } from "./Result";

interface IListProps {
  results: ReadonlyArray<IFeedItem>;
  onClick: (item: Readonly<IFeedItem>) => void;
};

export const List: FunctionComponent<IListProps> = (props: IListProps) => {
  const { results, onClick } = props;

  return (
    <ol class='list list-group feed-items' reversed>
      {results.map((result: Readonly<IFeedItem>) => (
        <Result
          key={result.guid}
          result={result}
          onClick={onClick}
        />
      ))}
    </ol>
  );
};
