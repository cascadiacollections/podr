import { h, FunctionComponent } from 'preact';

function formatDuration(duration: number): string {
  return new Date(1000 * duration).toISOString().substr(11, 8);
}

function formatPubDate(isoString: string): string {
  return new Date(isoString.replace(/-/g, "/")).toDateString();
}

interface IEnclosure {
  duration: number;
  link: string;
}

export interface IFeedItem {
  readonly guid: string;
  title: string;
  description: string;
  pubDate: string;
  enclosure: IEnclosure;
}

export interface IResultProps {
  result: Readonly<IFeedItem>;
  onClick: (feedItem: Readonly<IFeedItem>) => void;
}

export const Result: FunctionComponent<IResultProps> = (props: IResultProps) => {
  const { onClick, result } = props;
  const { description, title } = result;

  return (
    <li
      class={'result list-group-item list-group-item-action'}
      onClick={() => onClick(result)}
      tabIndex={0}>
      <a href={result.enclosure.link}>
        <h2 class='title' dangerouslySetInnerHTML={{ __html: title }} />
      </a>
      <strong class='pubDate'>{formatPubDate(result.pubDate)}</strong>
      <strong>&nbsp;&bull;&nbsp;</strong>
      <strong class='duration'>{formatDuration(result.enclosure.duration)}</strong>
      <p class='description' dangerouslySetInnerHTML={{ __html: description }} />
    </li>
  );
};
