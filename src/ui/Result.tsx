import { h, FunctionComponent } from 'preact';
import { useCallback } from 'preact/hooks';

function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  
  return [
    hours < 10 ? `0${hours}` : hours,
    minutes < 10 ? `0${minutes}` : minutes,
    seconds < 10 ? `0${seconds}` : seconds
  ].join(':');
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

  const onClickCallback = useCallback(() => {
    onClick(result);
  }, [result]);

  return (
    <li
      className={'result list-group-item list-group-item-action'}
      onClick={onClickCallback}
      tabIndex={0}>
      <a href={result.enclosure.link}>
        <h2 className='title' dangerouslySetInnerHTML={{ __html: title }} />
      </a>
      <strong className='pubDate'>{formatPubDate(result.pubDate)}</strong>
      <strong>&nbsp;&bull;&nbsp;</strong>
      <strong className='duration'>{formatDuration(result.enclosure.duration)}</strong>
      <p className='description' dangerouslySetInnerHTML={{ __html: description }} />
    </li>
  );
};
