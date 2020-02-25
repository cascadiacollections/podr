import { h } from 'preact';

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

// @todo: memoize
// tslint:disable-next-line
const Divider = () => {
  return <strong>&nbsp;&bull;&nbsp;</strong>;
};

// tslint:disable-next-line
export const Result = ({ result, onClick, played = false }) => {
  return (
    <li
      class={`result ${played ? 'played' : ''}`}
      onClick={() => onClick(result)}
      tabIndex={0}>
      <h2 class='title'>{result.title}</h2>
      <strong class='pubDate'>{formatPubDate(result.pubDate)}</strong>
      <Divider />
      <strong class='duration'>
        {formatDuration(result.enclosure.duration)}
      </strong>
      <p class='description'>{stripHtml(result.description)}</p>
      {false /* DEBUG */ && <pre>{JSON.stringify(result)}</pre>}
    </li>
  );
};
