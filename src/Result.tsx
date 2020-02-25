function formatDuration(duration) {
  return new Date(1000 * duration).toISOString().substr(11, 8);
}

function formatPubDate(isoString) {
  return new Date(isoString).toDateString();
}

function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

// @todo: memoize
const Divider = () => {
  return <strong>&nbsp;&bull;&nbsp;</strong>;
};

export const Result = ({ result, onClick, played = false }) => {
  return (
    <li
      class={`result ${played ? 'played' : ''}`}
      onClick={() => onClick(result)}
      tabindex="0">
      <h2 class="title">{result.title}</h2>
      <strong class="pubDate">{formatPubDate(result.pubDate)}</strong>
      <Divider />
      <strong class="duration">
        {formatDuration(result.enclosure.duration)}
      </strong>
      <p class="description">{stripHtml(result.description)}</p>
      {false /* DEBUG */ && <pre>{JSON.stringify(result)}</pre>}
    </li>
  );
};
