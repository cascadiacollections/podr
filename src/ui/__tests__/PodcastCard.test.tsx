import { h } from 'preact';
import { fireEvent, render, screen } from '@testing-library/preact';

import { IFeed } from '../../utils/AppContext';
import { PodcastCard } from '../PodcastCard';

const FEED: IFeed = {
  collectionName: 'Song Exploder',
  feedUrl: 'https://example.com/song-exploder.rss',
  artworkUrl100: 'https://example.com/artwork-100.jpg',
  artworkUrl600: 'https://example.com/artwork-600.jpg'
};

describe('PodcastCard', () => {
  it('opens the podcast when the card is pressed', () => {
    const onOpen = jest.fn();

    render(
      <PodcastCard feed={FEED} onOpen={onOpen} onToggleFavorite={jest.fn()} isFavorite={false} />
    );

    fireEvent.click(screen.getByRole('button', { name: FEED.collectionName }));

    expect(onOpen).toHaveBeenCalledWith(FEED);
  });

  it('exposes favoriting as a labelled, keyboard-reachable control', () => {
    const onToggleFavorite = jest.fn();

    render(
      <PodcastCard
        feed={FEED}
        onOpen={jest.fn()}
        onToggleFavorite={onToggleFavorite}
        isFavorite={false}
      />
    );

    const favorite = screen.getByRole('button', { name: `Add ${FEED.collectionName} to your library` });
    expect(favorite).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(favorite);

    expect(onToggleFavorite).toHaveBeenCalledWith(FEED);
  });

  it('reflects the favorited state', () => {
    render(
      <PodcastCard feed={FEED} onOpen={jest.fn()} onToggleFavorite={jest.fn()} isFavorite />
    );

    const favorite = screen.getByRole('button', {
      name: `Remove ${FEED.collectionName} from your library`
    });

    expect(favorite).toHaveAttribute('aria-pressed', 'true');
  });

  it('treats artwork as decorative and defers loading it', () => {
    render(
      <PodcastCard feed={FEED} onOpen={jest.fn()} onToggleFavorite={jest.fn()} isFavorite={false} />
    );

    // The name is real text beside the image, so alt text would only repeat it
    const artwork = screen.getByRole('button', { name: FEED.collectionName }).querySelector('img');

    expect(artwork).toHaveAttribute('alt', '');
    expect(artwork).toHaveAttribute('loading', 'lazy');
    expect(artwork).toHaveAttribute('decoding', 'async');
    expect(artwork).toHaveAttribute('width', '100');
    expect(artwork).toHaveAttribute('height', '100');
  });

  it('loads artwork eagerly when asked to', () => {
    render(
      <PodcastCard
        feed={FEED}
        onOpen={jest.fn()}
        onToggleFavorite={jest.fn()}
        isFavorite={false}
        lazy={false}
      />
    );

    const artwork = screen.getByRole('button', { name: FEED.collectionName }).querySelector('img');

    expect(artwork).toHaveAttribute('loading', 'eager');
  });

  it('marks the open podcast as current', () => {
    render(
      <PodcastCard
        feed={FEED}
        onOpen={jest.fn()}
        onToggleFavorite={jest.fn()}
        isFavorite={false}
        isCurrent
      />
    );

    expect(screen.getByRole('button', { name: FEED.collectionName })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });
});
