import { h, FunctionComponent } from 'preact';

function formatDuration(duration: number): string {
  return new Date(1000 * duration).toISOString().substr(11, 8);
}

function formatPubDate(isoString: string): string {
  return new Date(isoString.replace(/-/g, "/")).toDateString();
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
}

/* tslint:disable:variable-name*/
export const Result: FunctionComponent<IResultProps> = (props: IResultProps) => {
  const { onClick, result } = props;

  return (
    <li
      class={'result list-group-item list-group-item-action'}
      onClick={() => onClick(result)}
      tabIndex={0}>
      <h2 class='title' dangerouslySetInnerHTML={{ __html: result.title }} />
      <strong class='pubDate'>{formatPubDate(result.pubDate)}</strong>
      <strong>&nbsp;&bull;&nbsp;</strong>
      <strong class='duration'>{formatDuration(result.enclosure.duration)}</strong>
      <p class='description' dangerouslySetInnerHTML={{ __html: result.description }} />
    </li>
  );
};
