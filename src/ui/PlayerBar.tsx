import { FunctionComponent, h, Ref } from 'preact';

/**
 * The episode currently loaded into the player
 */
export interface INowPlaying {
  /** Identifies the episode so the list can highlight the row being played */
  readonly guid: string;
  readonly title: string;
  readonly podcastName: string;
  readonly artworkUrl: string;
}

export interface IPlayerBarProps {
  readonly audioRef: Ref<HTMLAudioElement>;
  /** Undefined until the listener picks an episode */
  readonly nowPlaying?: INowPlaying;
}

/**
 * Persistent playback bar.
 *
 * The audio element is always mounted so playback survives every re-render, but
 * the bar only shows itself once something is loaded - an empty transport control
 * pinned to the bottom of the page was pure noise. Autoplay is intentionally
 * absent: it starts on the click that chose the episode, which is also what
 * mobile browsers require.
 */
export const PlayerBar: FunctionComponent<IPlayerBarProps> = ({ audioRef, nowPlaying }: IPlayerBarProps) => {
  return (
    <div
      className="player-bar"
      hidden={!nowPlaying}
      aria-hidden={nowPlaying ? undefined : 'true'}
      role="region"
      aria-label="Episode player"
    >
      {nowPlaying ? (
        <img
          className="player-bar__artwork"
          src={nowPlaying.artworkUrl}
          width={44}
          height={44}
          alt=""
          decoding="async"
        />
      ) : null}
      <div className="player-bar__text">
        <div className="player-bar__title">{nowPlaying?.title}</div>
        <div className="player-bar__subtitle">{nowPlaying?.podcastName}</div>
      </div>
      <audio
        ref={audioRef}
        controls
        preload="none"
        aria-label={nowPlaying ? `Player for ${nowPlaying.title}` : 'Episode player'}
      />
    </div>
  );
};
