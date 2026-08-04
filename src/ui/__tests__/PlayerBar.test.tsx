import { createRef, h } from 'preact';
import { render, screen } from '@testing-library/preact';

import { PlayerBar } from '../PlayerBar';

describe('PlayerBar', () => {
  it('stays hidden until an episode is loaded', () => {
    const audioRef = createRef<HTMLAudioElement>();
    const { container } = render(<PlayerBar audioRef={audioRef} />);

    const bar = container.querySelector('.player-bar');

    expect(bar).toHaveAttribute('hidden');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the audio element mounted so playback survives re-renders', () => {
    const audioRef = createRef<HTMLAudioElement>();
    const { container, rerender } = render(<PlayerBar audioRef={audioRef} />);

    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio).not.toHaveAttribute('autoplay');
    expect(audio).toHaveAttribute('preload', 'none');

    rerender(
      <PlayerBar
        audioRef={audioRef}
        nowPlaying={{
          guid: 'episode-1',
          title: 'The Great Fire of London',
          podcastName: 'The Rest Is History',
          artworkUrl: 'https://example.com/artwork.jpg'
        }}
      />
    );

    // The same node, not a replacement: a remount would stop playback
    expect(container.querySelector('audio')).toBe(audio);
  });

  it('shows what is playing once an episode is loaded', () => {
    const audioRef = createRef<HTMLAudioElement>();
    const { container } = render(
      <PlayerBar
        audioRef={audioRef}
        nowPlaying={{
          guid: 'episode-1',
          title: 'The Great Fire of London',
          podcastName: 'The Rest Is History',
          artworkUrl: 'https://example.com/artwork.jpg'
        }}
      />
    );

    expect(container.querySelector('.player-bar')).not.toHaveAttribute('hidden');
    expect(screen.getByText('The Great Fire of London')).toBeInTheDocument();
    expect(screen.getByText('The Rest Is History')).toBeInTheDocument();
  });
});
