import './app.scss';

import fetchJsonp from 'fetch-jsonp';
import { Component, render, h, createRef, JSX, RefObject } from 'preact';
import { IFeedItem, Result } from './Result';

const TOKEN: string = `xwxutnum3sroxsxlretuqp0dvigu3hsbeydbhbo6`;
const MAX_COUNT: number = 300;

function getFeedUrl(feedUrl: string): string {
  return `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
    feedUrl
  )}&api_key=${TOKEN}&count=${MAX_COUNT}`;
}

interface IAppState {
  feeds: ReadonlyArray<IFeed>;
  results: ReadonlyArray<IFeedItem>;
  searchResults?: ReadonlyArray<IFeed>;
}

interface IFeed {
  collectionName: string;
  feedUrl: string;
}

/* tslint:disable:export-name*/
export default class App extends Component<{}, IAppState> {
  private readonly ref: RefObject<HTMLAudioElement> = createRef();
  private readonly completedPlayback: Set<string> = new Set<string>();
  private readonly pinnedFeeds: Set<IFeed> = new Set<IFeed>(
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

  public render(_: {}, state: IAppState): JSX.Element {
    const { feeds = [], searchResults = [] } = state;
    const results: ReadonlyArray<IFeedItem> = state.results;

    return (
      <main>
        <h1 class='display-1'>
          <a href='/'>Podr</a>
        </h1>
        <input class='form-control' type='search' placeholder='Search for a podcast' onKeyDown={this.onSearch} />
        { this.state.searchResults?.length ?
          <div>
            <h2 class='display-6'>Search</h2>
            <ul class='list-group' style={ {'min-height': 100 }}>
              {searchResults.map((result: IFeed) => (
                <li key={result} class='list-group-item list-group-item-action'>
                  <button
                    type='button'
                    class='btn btn-outline-primary'
                    onClick={() => this.pinFeedUrl(result)}
                    aria-label={`Favorite ${result}`}>Favorite</button>
                  <a href='#' onClick={() => this.tryFetchFeed(result.feedUrl)} style={{ marginLeft: 12 }}>
                    {result.collectionName}
                  </a>
                </li>
              ))}
            </ul>
          </div> : undefined
        }
        <h2 class='display-6'>Favorites</h2>
        <ul class='list-group' style={ {'min-height': 100 }}>
          {feeds.map((result) => (
            <li key={result} class='list-group-item list-group-item-action'>
              <button
                type='button'
                class='btn btn-outline-warning'
                onClick={() => this.unpinFeedUrl(result)}
                aria-label={`Unfavorite ${result}`}>Unfavorite</button>
              <a href='#' onClick={() => this.tryFetchFeed(result.feedUrl)} style={{ marginLeft: 12 }}>
                {result.collectionName}
              </a>
            </li>
          ))}
        </ul>
        <h2 class='display-6'>Episodes</h2>
        {/* Currently, reversed is not type-compatible even tho it is to spec.
        // @ts-ignore */ }
        <ol class='list list-group' reversed>
          {results.map((result: IFeedItem) => (
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

  private onSearch = (e: KeyboardEvent) => {
    const limit: number = 10;

    if (e.key === 'Enter') {
      const term: string = (e.target as HTMLInputElement).value;

      if (!term || !term.length) {
        return;
      }

      // tslint:disable-next-line:max-line-length
      const SEARCH_URL: string = `https://itunes.apple.com/search?media=podcast&term=${term}&limit=${limit}&callback=searchcb`;

      fetchJsonp(SEARCH_URL, { jsonpCallbackFunction: 'searchcb' }).then(async (response: fetchJsonp.Response) => {
        const json: { results: ReadonlyArray<IFeed> } = await response.json<{ results: ReadonlyArray<IFeed> }>();

        this.setState({
          searchResults: json.results
        });
      }).catch((err) => {
        console.error(err);
      });
    }
  }

  private getPinnedFeeds = (): ReadonlyArray<IFeed> => {
    return [...this.pinnedFeeds.values()];
  }

  private _getResults = (): ReadonlyArray<IFeedItem> => {
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
    return url.replace('http://', 'https://');
  }

  private onClick = (item: { enclosure: { link: string }}) => {
    const url: string = item.enclosure.link;

    if (this.ref.current) {
      this.ref.current.src = this.getSecureUrl(url);
    }
  }

  private pinFeedUrl = (feed: IFeed) => {
    this.pinnedFeeds.add(feed);

    this.setState({
      feeds: this.getPinnedFeeds()
    });

    this.serializePinnedFeeds();
  }

  private unpinFeedUrl = (feed: IFeed) => {
    this.pinnedFeeds.delete(feed);

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
