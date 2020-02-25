import './style';
import { Component, render, createRef, Fragment, JSX } from 'preact';
import { Result } from './Result';
import { version } from '../package.json';

const FEED_URL: string  = 'https://feeds.feedburner.com/TellEmSteveDave';
const TOKEN: string = `xwxutnum3sroxsxlretuqp0dvigu3hsbeydbhbo6`;
const MAX_COUNT: number = 300;
const PINNED_FEEDS: string[] = [
  'https://feeds.feedburner.com/SModcasts',
  'https://feeds.feedburner.com/TellEmSteveDave',
  'https://rss.art19.com/id10t',
];

function getFeedUrl(feedUrl: string = FEED_URL): string {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
    feedUrl
  )}&api_key=${TOKEN}&count=${MAX_COUNT}`;
}

export default class App extends Component<{}, { title: string, BUILD_DEBUG: boolean, feeds: string[], results: any[], version: string }> {
  ref = createRef();
  pinnedFeeds = new Set<string>(
    JSON.parse(localStorage.getItem('podr_feeds')!) || PINNED_FEEDS
  );
  completedPlayback = new Set();

  getPinnedFeeds = (): string[] => {
    return [...this.pinnedFeeds];
  };

  componentDidMount() {
    const results = [];

    this.setState({
      feeds: this.getPinnedFeeds(),
      results,
      version,
      BUILD_DEBUG: false,
    });

    this.tryFetchFeed();

    if (this.ref.current) {
      this.ref.current.addEventListener('ended', (event) => {
        const url = event.target.src;
        this.completedPlayback.add(url);
        // @todo: hack
        this.forceUpdate();
      });
    }

    window.addEventListener('keydown', (event) => {
      if (event.keyCode === 192) {
        this.setState({ BUILD_DEBUG: !this.state.BUILD_DEBUG });
      }
    });
  }

  tryFetchFeed(feedUrl = FEED_URL) {
    fetch(getFeedUrl(feedUrl), { cache: 'force-cache' })
      .then((response) => response.json())
      .then(({ items: results = [], feed = {} }) => {
        const { title } = feed;

        this.setState({
          results,
          title,
        });
      });
  }

  getSecureUrl = (url: string) => {
    return url.replace('http', 'https');
  };

  onClick = (item) => {
    const url = item.enclosure.link || '';
    this.ref.current.src = this.getSecureUrl(url);
  };

  pinFeedUrl = (event) => {
    const feedUrl = event.target.value;
    event.target.value = '';

    this.pinnedFeeds.add(feedUrl);

    this.setState({
      feeds: this.getPinnedFeeds(),
    });

    this.serializePinnedFeeds();
  };

  unpinFeedUrl = (feedUrl) => {
    this.pinnedFeeds.delete(feedUrl);

    this.setState({
      feeds: this.getPinnedFeeds(),
    });

    this.serializePinnedFeeds();
  };

  serializePinnedFeeds = () => {
    localStorage.setItem('podr_feeds', JSON.stringify(this.getPinnedFeeds()));
  };

  render(props, { feeds = [], results = [], version, title, BUILD_DEBUG }): JSX.Element {
    return (
      <Fragment>
        {BUILD_DEBUG && (
          <Fragment>
            <h2>Favorites</h2>
            <ul>
              <li>
                <input
                  type="url"
                  placeholder="Feed URL"
                  onInput={this.pinFeedUrl}
                />
              </li>
              {feeds.map((result) => (
                <li key={result}>
                  <span
                    onClick={() => this.unpinFeedUrl(result)}
                    role="img"
                    aria-label={`Unfavorite ${result}`}>
                    🗑️
                  </span>
                  <span onClick={() => this.tryFetchFeed(result)}>
                    {result}
                  </span>
                </li>
              ))}
            </ul>
          </Fragment>
        )}
        <h1>
          <a href="/">{title}</a>
        </h1>
        <ol class="list" reversed>
          {results.map((result) => (
            <Result
              key={result.guid}
              result={result}
              onClick={this.onClick}
              played={this.completedPlayback.has(
                this.getSecureUrl(result.enclosure.link || '')
              )}
            />
          ))}
        </ol>
        <audio ref={this.ref} autoplay controls preload="auto" />
        <br />
        <footer>
          Version: {version}
          <br />
          <a
            href="https://twitter.com/cascadiaco"
            target="_blank"
            rel="noopener noreferrer">
            @cascadiaco
          </a>
        </footer>
      </Fragment>
    );
  }
}

if (typeof window !== 'undefined') {
  render(<App />, document.getElementById('root')!);
}
