import './app.scss';

import { Component, render, h, createRef, JSX, RefObject } from 'preact';
import { Result } from './Result';

const FEED_URL: string = 'https://feeds.feedburner.com/TellEmSteveDave';
const TOKEN: string = `xwxutnum3sroxsxlretuqp0dvigu3hsbeydbhbo6`;
const MAX_COUNT: number = 300;
const PINNED_FEEDS: string[] = [
  'https://feeds.feedburner.com/SModcasts',
  'https://feeds.feedburner.com/TellEmSteveDave',
  'https://rss.art19.com/id10t'
];

function getFeedUrl(feedUrl: string = FEED_URL): string {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
    feedUrl
  )}&api_key=${TOKEN}&count=${MAX_COUNT}`;
}

interface IAppState {
  feeds: ReadonlyArray<string>;
  results: ReadonlyArray<{}>;
}

export default class App extends Component<{}, IAppState> {
  private readonly ref: RefObject<HTMLAudioElement> = createRef();
  private readonly completedPlayback: Set<string> = new Set<string>();
  private readonly pinnedFeeds: Set<string> = new Set<string>(
    JSON.parse(localStorage.getItem('podr_feeds')!) || PINNED_FEEDS
  );

  public constructor() {
    super();

    this.state = {
      feeds: this.getPinnedFeeds(),
      results: this._getResults()
    };
  }

  public componentDidMount(): void {
    this.tryFetchFeed();

    this.ref.current?.addEventListener('ended', (event: Event) => {
      const url: string = (event.target as HTMLAudioElement).src;
      this.completedPlayback.add(url);
      this.forceUpdate();
    });
  }

  public render(props: {}, state: IAppState): JSX.Element {
    const { feeds = [], results = [] } = state;

    return (
      <main>
        <h2>Favorites</h2>
        <input
          type='url'
          placeholder='Paste feed e.g. https://feeds.feedburner.com/TellEmSteveDave'
          onInput={this.pinFeedUrl} />
        <ul>
          {feeds.map((result) => (
            <li key={result}>
              <span
                onClick={() => this.unpinFeedUrl(result)}
                role='img'
                aria-label={`Unfavorite ${result}`}>
                🗑️
              </span>
              <a href="#" onClick={() => this.tryFetchFeed(result)}>
                {result}
              </a>
            </li>
          ))}
        </ul>
        <h1>
          <a href='/'>Podr</a>
        </h1>
        {/* Currently, reversed is not type-compatible even tho it is to spec.
        // @ts-ignore */ }
        <ol class='list' reversed>
          {results.map((result) => (
            <Result
              key={(result as { guid: string }).guid}
              result={result}
              onClick={this.onClick}
              played={this.completedPlayback.has(
                this.getSecureUrl((result as { enclosure: { link: string }}).enclosure.link || '')
              )}
            />
          ))}
        </ol>
        {/* Currently, autoplay is not type-compatible even tho it is to spec.
        // @ts-ignore */ }
        <audio ref={this.ref} autoplay controls preload='auto' />
        <br />
        <footer>
          <a
            href='https://twitter.com/cascadiaco'
            target='_blank'
            rel='noopener noreferrer'>
            @cascadiaco
          </a>
        </footer>
      </main>
    );
  }

  private getPinnedFeeds = (): ReadonlyArray<string> => {
    return [...this.pinnedFeeds.values()];
  }

  private _getResults = (): ReadonlyArray<{}> => {
    return JSON.parse(localStorage.getItem('podr_results')!) || [];
  }

  private _setResults = (results: ReadonlyArray<{}> = []) => {
    localStorage.setItem('podr_results', JSON.stringify(results));
  }

  private tryFetchFeed(feedUrl: string = FEED_URL): void {
    void fetch(getFeedUrl(feedUrl), { cache: 'force-cache' })
      .then((response) => response.json())
      .then(({ items: results = [], feed = {} }) => {
        this._setResults(results);

        this.setState({
          results
        });
      });
  }

  private getSecureUrl = (url: string) => {
    return url.replace('http', 'https');
  }

  private onClick = (item: any) => {
    const url: string = item.enclosure.link || '';
    (this.ref.current as HTMLAudioElement).src = this.getSecureUrl(url);
  }

  private pinFeedUrl = (event: Event) => {
    const feedUrl: string = (event.target as HTMLInputElement).value;

    this.pinnedFeeds.add(feedUrl);

    this.setState({
      feeds: this.getPinnedFeeds()
    });

    this.serializePinnedFeeds();

    (event.target as HTMLInputElement).value = '';
  }

  private unpinFeedUrl = (feedUrl: string) => {
    this.pinnedFeeds.delete(feedUrl);

    this.setState({
      feeds: this.getPinnedFeeds()
    });

    this.serializePinnedFeeds();
  }

  private serializePinnedFeeds = () => {
    localStorage.setItem('podr_feeds', JSON.stringify(this.getPinnedFeeds()));
  }
}

if (typeof window !== 'undefined') {
  render(<App />, document.getElementById('root')!);
}
