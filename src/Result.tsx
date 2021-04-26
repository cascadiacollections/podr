import { h, FunctionComponent } from 'preact';

function formatDuration(duration: number): string {
  return new Date(1000 * duration).toISOString().substr(11, 8);
}

function formatPubDate(isoString: string): string {
  return new Date(isoString).toDateString();
}

function stripHtml(html: string): string {
  const doc: Document = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

interface IEnclosure {
  duration: number;
  link: string;
}

export interface IFeedItem {
  guid: string;
  title: string;
  description: string;
  pubDate: string;
  enclosure: IEnclosure;
}

interface IResultProps {
  result: IFeedItem;
  onClick: (feedItem: IFeedItem) => void;
  played?: boolean;
}

export const Result: FunctionComponent<IResultProps> = (props: IResultProps) => {
  const { played, onClick, result } = props;

  return (
    <li
      class={`result ${played ? 'played' : ''}`}
      onClick={() => onClick(result)}
      tabIndex={0}>
      <h2 class='title'>{result.title}</h2>
      <strong class='pubDate'>{formatPubDate(result.pubDate)}</strong>
      <strong>&nbsp;&bull;&nbsp;</strong>
      <strong class='duration'>
        {formatDuration(result.enclosure.duration)}
      </strong>
      <p class='description'>{stripHtml(result.description)}</p>
    </li>
  );
};
