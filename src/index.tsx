import './style/index.scss';

import { Component, render, h, createRef, JSX, RefObject } from 'preact';
import { Result } from './Result';

const FEED_URL: string  = 'https://feeds.feedburner.com/TellEmSteveDave';
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
  title: string;
  BUILD_DEBUG: boolean;
  feeds: string[];
  results: ReadonlyArray<{}>;
  version: string;
}

export default class App extends Component<{}, IAppState> {
  private ref: RefObject<HTMLAudioElement> = createRef();
  private pinnedFeeds: Set<string> = new Set<string>(
    JSON.parse(localStorage.getItem('podr_feeds')!) || PINNED_FEEDS
  );
  private completedPlayback: Set<string> = new Set<string>();

  public componentDidMount(): void {
    this.setState({
      feeds: this.getPinnedFeeds(),
      results: this._getResults(),
      BUILD_DEBUG: false
    });

    this.tryFetchFeed();

    if (this.ref.current) {
      this.ref.current.addEventListener('ended', (event: Event) => {
        const url: string = (event.target as HTMLAudioElement).src;
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

  public render(props: {}, { feeds = [], results = [], version: VERSION, title, BUILD_DEBUG }: IAppState): JSX.Element {
    return (
      <div>
        {BUILD_DEBUG && (
          <div>
            <h2>Favorites</h2>
            <ul>
              <li>
                <input
                  type='url'
                  placeholder='Feed URL'
                  onInput={this.pinFeedUrl}
                />
              </li>
              {feeds.map((result) => (
                <li key={result}>
                  <span
                    onClick={() => this.unpinFeedUrl(result)}
                    role='img'
                    aria-label={`Unfavorite ${result}`}>
                    🗑️
                  </span>
                  <span onClick={() => this.tryFetchFeed(result)}>
                    {result}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h1>
          <a href='/'>{title}</a>
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
      </div>
    );
  }

  private getPinnedFeeds = (): string[] => {
    return [];
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
        const { title } = feed;

        this._setResults(results);

        this.setState({
          results,
          title
        });
      });
  }

  private getSecureUrl = (url: string) => {
    return url.replace('http', 'https');
  }

  // tslint:disable-next-line
  private onClick = (item: any) => {
    const url: string = item.enclosure.link || '';
    (this.ref.current as HTMLAudioElement).src = this.getSecureUrl(url);
  }

  // tslint:disable-next-line
  private pinFeedUrl = (event: any) => {
    const feedUrl: string = (event.target as HTMLInputElement).value;
    (event.target as HTMLInputElement).value = '';

    this.pinnedFeeds.add(feedUrl);

    this.setState({
      feeds: this.getPinnedFeeds()
    });

    this.serializePinnedFeeds();
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
