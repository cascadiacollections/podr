import { h } from "preact";
import { IFeedItem } from "./Result";
import { Result } from "./Result";

interface IListProps {
  results: readonly IFeedItem[];
  onClick: (item: IFeedItem) => void;
};

export const List = (props: IListProps) => {
  const { results, onClick } = props;

  return (
    // @ts-ignore reversed
    <ol class='list list-group feed-items' reversed>
      {results.map((result: IFeedItem) => (
        <Result
          key={result.guid}
          result={result}
          onClick={onClick}
        />
      ))}
    </ol>
  );
};
