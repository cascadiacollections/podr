import fetchJsonp from 'fetch-jsonp';
import { Component, h, createRef, JSX, RefObject, Fragment } from 'preact';

import { IFeedItem } from './Result';
import { List } from './List';
import { getFeedUrl, getSecureUrl, ToArray } from '../utils/helpers';

interface IAppState {
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

declare var gtag: any;

export class App extends Component<{}, IAppState> {
  private readonly ref: RefObject<HTMLAudioElement> = createRef();
  private readonly searchRef: RefObject<HTMLInputElement> = createRef();
  private readonly _pinnedFeeds: Map<string, IFeed> = new Map<string, IFeed>();

  private get pinnedFeeds(): IFeed[] {
    return ToArray(this._pinnedFeeds.values())
  }

  public constructor() {
    super();

    const feeds: ReadonlyArray<IFeed> = JSON.parse(localStorage.getItem('podr_feeds') || '[]');

    feeds.forEach((feed: IFeed) => {
      this._pinnedFeeds.set(feed.feedUrl, feed);
    });

    this.state = {
      feeds: this.pinnedFeeds,
      results: JSON.parse(localStorage.getItem('podr_results') || '[]')
    };
  }

  public componentDidMount(): void {
    this.tryFetchFeed();
  }

  public render(_: {}, state: IAppState): JSX.Element {
    const { feeds = [], searchResults = [], results } = state;

    return (
      <Fragment>
        <h1>
          <a href='/'>Podr</a>
        </h1>
        <input ref={this.searchRef} class='form-control' type='search' placeholder='Search podcasts e.g. "Kevin Smith"' onKeyDown={this.onSearch} />
        { this.state.searchResults?.length ?
          <Fragment>
            <h2 class="section-header">Results for "{this.searchRef.current?.value}"</h2>
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
        <audio ref={this.ref} autoplay controls preload='auto' />
      </Fragment>
    );
  }

  private onSearch = (e: KeyboardEvent) => {
    const limit: number = 14; // iTunes API defaults to 10

    if (e.key === 'Enter') {
      const term: string | undefined = this.searchRef.current?.value;

      gtag('send', {
        hitType: 'event',
        eventCategory: 'Feed',
        eventAction: 'search',
        eventLabel: term
      });

      if (!term || !term.length) {
        return this.setState( {
          searchResults: []
        });
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

  private tryFetchFeed(feedUrl?: string): void {
    if (!feedUrl) {
      return;
    }

    void fetch(getFeedUrl(feedUrl), { cache: 'force-cache' })
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

    gtag('send', {
      hitType: 'event',
      eventCategory: 'Media',
      eventAction: 'play',
      eventLabel: url
    });

    if (this.ref.current) {
      this.ref.current.src = getSecureUrl(url);
    }
  }

  private pinFeedUrl = (feed: IFeed) => {
    this._pinnedFeeds.set(feed.feedUrl, feed);

    gtag('send', {
      hitType: 'event',
      eventCategory: 'Feed',
      eventAction: 'favorite',
      eventLabel: feed.feedUrl
    });

    this.setState({
      feeds: this.pinnedFeeds
    });

    this.serializePinnedFeeds();
  }

  private unpinFeedUrl = (feed: IFeed) => {
    this._pinnedFeeds.delete(feed.feedUrl);

    gtag('send', {
      hitType: 'event',
      eventCategory: 'Feed',
      eventAction: 'unfavorite',
      eventLabel: feed.feedUrl
    });

    this.setState({
      feeds: ToArray(this.pinnedFeeds.values())
    });

    this.serializePinnedFeeds();
  }

  private serializePinnedFeeds = () => {
    localStorage.setItem('podr_feeds', JSON.stringify(ToArray(this.pinnedFeeds.values())));
  }
}
