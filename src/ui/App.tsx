import { Component, h, createRef, JSX, RefObject, Fragment } from 'preact';

import { IFeedItem } from './Result';
import { List } from './List';
import { getFeedUrl, getSecureUrl, ToArray } from '../utils/helpers';
import { Search } from './Search';

interface IAppState {
  query: string;
  feeds: ReadonlyArray<IFeed>;
  results: ReadonlyArray<IFeedItem>;
  searchResults?: ReadonlyArray<IFeed>;
}

interface IFeed {
  readonly collectionName: string;
  readonly feedUrl: string;
  readonly artworkUrl100: string;
  readonly artworkUrl600: string;
}

export class App extends Component<{}, IAppState> {
  private static readonly AudioRef: RefObject<HTMLAudioElement> = createRef();
  private static readonly Favorited: Set<IFeed> = new Set<IFeed>();

  private get feeds(): IFeed[] {
    return ToArray(App.Favorited.values())
  }

  public constructor() {
    super();

    JSON.parse(localStorage.getItem('podr_feeds') || '[]').forEach((feed: IFeed) => {
      App.Favorited.add(feed);
    });

    this.state = {
      query: '',
      feeds: this.feeds,
      results: JSON.parse(localStorage.getItem('podr_results') || '[]')
    };

    this.tryFetchFeed();
  }

  private onSearch = (query: string, limit: number = 14) => {
    gtag('event', 'search', {
      'search_term': query,
      transport: 'beacon'
    });

    if (!query || !query.length) {
      return this.setState( {
        searchResults: []
      });
    }

    const queryParams: URLSearchParams = new URLSearchParams([['q', query], ['limit', limit.toString()]]);

    fetch(`https://podr-service.cascadiacollections.workers.dev?${queryParams.toString()}`).then(async (response: Response) => {
      const json: { results: ReadonlyArray<IFeed> } = await response.json();

      this.setState({
        query,
        searchResults: json.results
      });
    }).catch((err: Error) => {
      gtag('event', 'exception', {
        description: `search_fetch_${limit}_${query}_${err.message}`,
        fatal: false
      });
    });
  }

  public render(_: {}, state: IAppState): JSX.Element {
    const { feeds = [], searchResults = [], results } = state;

    return (
      <Fragment>
        <h1>
          <a href='/'>Podr</a>
        </h1>
        <Search onSearch={this.onSearch} />
        { this.state.searchResults?.length ?
          <Fragment>
            <h2 class="section-header">Results for "{this.state.query}"</h2>
            <div class="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
              {searchResults.map((result: IFeed) => (
                <img
                  key={result.collectionName}
                  src={result.artworkUrl100}
                  height={100}
                  width={100}
                  class='img-fluid rounded-3'
                  alt={result.collectionName}
                  onClick={() => this.tryFetchFeed(result.feedUrl)}
                  onDblClick={() => this.pinFeedUrl(result)}
                  aria-label={`Favorite ${result}`} />
              ))}
            </div>
          </Fragment> : undefined
        }
        <h2 class="section-header">Favorites</h2>
        <div class="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
        {feeds.map((result) => (
          <img
            key={result.collectionName}
            src={result.artworkUrl100}
            height={100}
            width={100}
            class='img-fluid rounded-3'
            alt={result.collectionName}
            onClick={() => this.tryFetchFeed(result.feedUrl)}
            onDblClick={() => this.unpinFeedUrl(result)} />
        ))}
        </div>
        <h2 class="section-header">Episodes</h2>
        <List results={results} onClick={this.onClick} />
        { /* @ts-ignore autoplay */ }
        <audio ref={App.AudioRef} autoplay controls preload='auto' />
      </Fragment>
    );
  }

  private async tryFetchFeed(feedUrl?: string): Promise<void> {
    if (!feedUrl) {
      return;
    }

    return fetch(getFeedUrl(feedUrl), { cache: 'force-cache' })
      .then((response) => response.json())
      .then(({ items: results = [] }) => {
        localStorage.setItem('podr_results', JSON.stringify(results));

        this.setState({
          results
        });
      });
  }

  private onClick = (item: { enclosure: { link: string }}) => {
    const url: string = item.enclosure.link;


    gtag('event', 'Audio', {
      eventAction: 'play',
      eventLabel: url,
      transport: 'beacon'
    });

    if (App.AudioRef.current) {
      App.AudioRef.current.src = getSecureUrl(url);
    }
  }

  private pinFeedUrl = (feed: IFeed) => {
    App.Favorited.add(feed);

    gtag('event', 'Feed', {
      eventAction: 'favorite',
      eventLabel: feed.feedUrl,
      transport: 'beacon'
    });

    this.setState({
      feeds: this.feeds
    });

    this.serializePinnedFeeds();
  }

  private unpinFeedUrl = (feed: IFeed) => {
    App.Favorited.delete(feed);

    gtag('event', 'Feed', {
      eventAction: 'unfavorite',
      eventLabel: feed.feedUrl,
      transport: 'beacon'
    });

    this.setState({
      feeds: this.feeds
    });

    this.serializePinnedFeeds();
  }

  private serializePinnedFeeds = () => {
    localStorage.setItem('podr_feeds', JSON.stringify(this.feeds));
  }
}
