import './app.scss';

import { Component, render, h, createRef, JSX, RefObject } from 'preact';
import { Result } from './Result';

const TOKEN: string = `xwxutnum3sroxsxlretuqp0dvigu3hsbeydbhbo6`;
const MAX_COUNT: number = 300;

function getFeedUrl(feedUrl: string): string {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
    feedUrl
  )}&api_key=${TOKEN}&count=${MAX_COUNT}`;
}

interface IAppState {
  feeds: ReadonlyArray<string>;
  results: ReadonlyArray<{}>;
}

/* tslint:disable:export-name*/
export default class App extends Component<{}, IAppState> {
  private readonly ref: RefObject<HTMLAudioElement> = createRef();
  private readonly completedPlayback: Set<string> = new Set<string>();
  private readonly pinnedFeeds: Set<string> = new Set<string>(
    JSON.parse(localStorage.getItem('podr_feeds')!) || []
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
        <h1>
          <a href='/'>Podr</a>
        </h1>
        <h2>Favorites</h2>
        <button
          onClick={() => this.pinFeedUrl(prompt('Paste feed e.g. https://feeds.feedburner.com/TellEmSteveDave')) }>
            Add favorite
        </button>
        <ul>
          {feeds.map((result) => (
            <li key={result}>
              <span
                onClick={() => this.unpinFeedUrl(result)}
                role='img'
                aria-label={`Unfavorite ${result}`}>
                🗑️
              </span>
              <a href='#' onClick={() => this.tryFetchFeed(result)}>
                {result}
              </a>
            </li>
          ))}
        </ul>
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

  private tryFetchFeed(feedUrl?: string): void {
    if (!feedUrl) {
      return;
    }

    void fetch(getFeedUrl(feedUrl), { cache: 'force-cache' })
      .then((response) => response.json())
      .then(({ items: results = [] }) => {
        this._setResults(results);

        this.setState({
          results
        });
      });
  }

  private getSecureUrl = (url: string) => {
    return url.replace('http', 'https');
  }

  private onClick = (item: { enclosure: { link: string }}) => {
    const url: string = item.enclosure.link;

    if (this.ref.current) {
      this.ref.current.src = this.getSecureUrl(url);
    }
  }

  private pinFeedUrl = (url: string | null) => {
    if (!url) {
      return;
    }

    this.pinnedFeeds.add(url);

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
