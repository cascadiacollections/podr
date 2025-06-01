import { FunctionComponent, h } from "preact";
import { memo } from "preact/compat";
import { IFeedItem } from "./Result";
import { Result } from "./Result";

interface IListProps {
  results: ReadonlyArray<IFeedItem>;
  onClick: (item: Readonly<IFeedItem>) => void;
};

/**
 * List component that renders a table of podcast episodes
 * Using Pico's classless table approach for responsive design
 */
export const List: FunctionComponent<IListProps> = memo(
  (props: IListProps) => {
    const { results, onClick } = props;

    return (
      <section className="episodes-container">
        <table>
          <caption>Podcast Episodes</caption>
          <thead>
            <tr>
              <th scope="col">Episode</th>
              <th scope="col" className="date-column">Date</th>
              <th scope="col" className="duration-column">Duration</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result: Readonly<IFeedItem>) => (
              <Result
                key={result.guid}
                result={result}
                onClick={onClick}
              />
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={3}>No episodes available. Search or select a podcast to see episodes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
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
