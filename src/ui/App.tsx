import { Component, h, createRef, JSX, RefObject, Fragment } from 'preact';

import { IFeedItem } from './Result';
import { List } from './List';
import { getFeedUrl, getSecureUrl, ToArray, resolveFeedUrl } from '../utils/helpers';
import { Search } from './Search';

interface IAppState {
  query: string;
  feeds: ReadonlyArray<IFeed>;
  results: ReadonlyArray<IFeedItem>;
  searchResults?: ReadonlyArray<IFeed>;
  topResults?: ReadonlyArray<ITopPodcast>;
}

interface IFeed {
  readonly collectionName: string;
  readonly feedUrl: string;
  readonly artworkUrl100: string;
  readonly artworkUrl600: string;
}

interface ITopPodcast {
  readonly title: {
    readonly label: string;
  };
  readonly id: {
    readonly label: string;
    readonly attributes: {
      readonly 'im:id': string;
    };
  };
  readonly 'im:image': ReadonlyArray<{
    readonly label: string;
  }>;
}

declare global {
  interface Window { 
    gtag: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}

export class App extends Component<{}, IAppState> {
  private static readonly AudioRef: RefObject<HTMLAudioElement> = createRef();
  private static readonly Favorited: Set<IFeed> = new Set<IFeed>();
  
  // Constants
  private static readonly API_BASE_URL = 'https://podr-service.cascadiacollections.workers.dev';
  private static readonly LOCAL_STORAGE_FEEDS_KEY = 'podr_feeds';
  private static readonly LOCAL_STORAGE_RESULTS_KEY = 'podr_results';
  private static readonly DEFAULT_SEARCH_LIMIT = 14;

  private get feeds(): IFeed[] {
    return ToArray(App.Favorited.values())
  }

  public constructor() {
    super();

    JSON.parse(localStorage.getItem(App.LOCAL_STORAGE_FEEDS_KEY) || '[]').forEach((feed: IFeed) => {
      App.Favorited.add(feed);
    });

    this.state = {
      query: '',
      feeds: this.feeds,
      results: JSON.parse(localStorage.getItem(App.LOCAL_STORAGE_RESULTS_KEY) || '[]')
    };

    fetch(`${App.API_BASE_URL}/?q=toppodcasts&limit=10`).then(async (response: Response) => {
      const json: { feed: { entry: ReadonlyArray<ITopPodcast> } } = await response.json();

      this.setState({
        topResults: json.feed.entry
      });
    }).catch((err: Error) => {
      window.gtag('event', 'exception', {
        description: `search_fetch_toppodcasts_${err.message}`,
        fatal: false
      });
    });

    this.tryFetchFeed();
  }

  private onSearch = (query: string, limit: number = App.DEFAULT_SEARCH_LIMIT) => {
    window.gtag('event', 'search', {
      'search_term': query,
      transport: 'beacon'
    });

    if (!query || !query.length) {
      return this.setState( {
        searchResults: []
      });
    }

    const queryParams: URLSearchParams = new URLSearchParams([['q', query], ['limit', limit.toString()]]);

    fetch(`${App.API_BASE_URL}/?${queryParams.toString()}`).then(async (response: Response) => {
      const json: { results: ReadonlyArray<IFeed> } = await response.json();

      this.setState({
        query,
        searchResults: json.results
      });
    }).catch((err: Error) => {
      window.gtag('event', 'exception', {
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
            <h2 className="section-header">Results for "{this.state.query}"</h2>
            <div className="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
              {searchResults.map((result: IFeed) => (
                <img
                  key={result.collectionName}
                  src={result.artworkUrl100}
                  height={100}
                  width={100}
                  className='img-fluid rounded-3'
                  alt={result.collectionName}
                  onClick={() => this.tryFetchFeed(result.feedUrl)}
                  onDblClick={() => this.pinFeedUrl(result)}
                  aria-label={`Favorite ${result.collectionName}`} />
              ))}
            </div>
          </Fragment> : undefined
        }
        <Fragment>
          <h2 className="section-header">Top podcasts</h2>
          <div className="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
            {this.state.topResults && this.state.topResults.map((result: ITopPodcast) => (
              <img
                key={result.title.label}
                src={result['im:image'][2].label}
                height={100}
                width={100}
                className='img-fluid rounded-3'
                alt={result.title.label}
                onClick={async () => {
                  const itunesId = result.id.attributes['im:id'];
                  const feedResults = await fetch(`${App.API_BASE_URL}/?q=${itunesId}`).then(async (response: Response) => {
                    return await response.json();
                  }).catch((err: Error) => {
                    window.gtag('event', 'exception', {
                      description: `fetch_podcast_${itunesId}_${err.message}`,
                      fatal: false
                    });
                    return { results: [] };
                  });
                  
                  if (feedResults?.results?.length > 0) {
                    const feedUrl = feedResults.results[0].feedUrl;
                    this.tryFetchFeed(feedUrl);
                  }
                }}
                onDblClick={() => this.pinFeedUrl(result.id.label)}
                aria-label={`Favorite ${result.title.label}`} />
            ))}
          </div>
        </Fragment>
        <h2 className="section-header">Favorites</h2>
        <div className="feeds d-grid gap-3 d-flex flex-row flex-wrap justify-content-evenly align-items-start">
        {feeds.map((result) => (
          <img
            key={result.collectionName}
            src={result.artworkUrl100}
            height={100}
            width={100}
            className='img-fluid rounded-3'
            alt={result.collectionName}
            onClick={() => this.tryFetchFeed(result.feedUrl)}
            onDblClick={() => this.unpinFeedUrl(result)} />
        ))}
        </div>
        <h2 className="section-header">Episodes</h2>
        <List results={results} onClick={this.onClick} />
        <audio 
          ref={App.AudioRef} 
          autoPlay 
          controls 
          preload='auto'
          aria-label="Podcast episode player" 
        />
      </Fragment>
    );
  }

  private async tryFetchFeed(feedUrl?: string): Promise<void> {
    if (!feedUrl) {
      return;
    }

    try {
      // Resolve the feed URL (converts Apple Podcasts URLs to RSS feed URLs)
      const resolvedFeedUrl = await resolveFeedUrl(feedUrl);
      
      return fetch(getFeedUrl(resolvedFeedUrl), { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(({ items: results = [] }) => {
          localStorage.setItem(App.LOCAL_STORAGE_RESULTS_KEY, JSON.stringify(results));

          this.setState({
            results
          });
        })
        .catch((err: Error) => {
          window.gtag('event', 'exception', {
            description: `feed_fetch_${feedUrl}_${err.message}`,
            fatal: false
          });
        });
    } catch (err: unknown) {
      // Handle errors from resolveFeedUrl
      window.gtag('event', 'exception', {
        description: `feed_resolve_${feedUrl}_${(err as Error).message}`,
        fatal: false
      });
    }
  }

  private onClick = (item: IFeedItem) => {
    const url: string = item.enclosure.link;

    window.gtag('event', 'Audio', {
      eventAction: 'play',
      eventLabel: url,
      transport: 'beacon'
    });

    if (App.AudioRef.current) {
      App.AudioRef.current.src = getSecureUrl(url);
    }
  }

  private pinFeedUrl = (feed: IFeed | string) => {
    if (typeof feed === 'string') {
      // Create a simple feed object for string URLs
      const simpleFeed: IFeed = {
        collectionName: feed,
        feedUrl: feed,
        artworkUrl100: '',
        artworkUrl600: ''
      };
      App.Favorited.add(simpleFeed);
      
      window.gtag('event', 'Feed', {
        eventAction: 'favorite',
        eventLabel: feed,
        transport: 'beacon'
      });
    } else {
      App.Favorited.add(feed);
      
      window.gtag('event', 'Feed', {
        eventAction: 'favorite',
        eventLabel: feed.feedUrl,
        transport: 'beacon'
      });
    }

    this.setState({
      feeds: this.feeds
    });

    this.serializePinnedFeeds();
  }

  private unpinFeedUrl = (feed: IFeed) => {
    App.Favorited.delete(feed);

    window.gtag('event', 'Feed', {
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
    localStorage.setItem(App.LOCAL_STORAGE_FEEDS_KEY, JSON.stringify(this.feeds));
  }
}
