import { FunctionComponent, h } from "preact";
import { memo } from "preact/compat";
import { IFeedItem } from "./Result";
import { Result } from "./Result";

interface IListProps {
  results: ReadonlyArray<IFeedItem>;
  onClick: (item: Readonly<IFeedItem>) => void;
};

/**
 * List component that renders a list of podcast episodes
 * Memoized to prevent unnecessary re-renders
 */
export const List: FunctionComponent<IListProps> = memo(
  (props: IListProps) => {
    const { results, onClick } = props;

    return (
      <ol 
        className='list list-group feed-items' 
        reversed
        aria-label="Podcast episodes"
      >
        {results.map((result: Readonly<IFeedItem>) => (
          <Result
            key={result.guid}
            result={result}
            onClick={onClick}
          />
        ))}
        {results.length === 0 && (
          <li className="list-group-item empty-state">
            No episodes available. Search or select a podcast to see episodes.
          </li>
        )}
      </ol>
    );
  },
  // Custom comparison for memoization
  (prevProps, nextProps) => {
    // Only re-render if the results array has changed in length or content
    if (prevProps.results.length !== nextProps.results.length) {
      return false;
    }
    
    // Simple reference equality check is usually sufficient
    // since the results array is typically replaced entirely
    return prevProps.results === nextProps.results;
  }
);
