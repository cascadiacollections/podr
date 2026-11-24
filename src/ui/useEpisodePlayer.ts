import { Signal } from '@preact/signals';
import { useCallback } from 'preact/hooks';

import { trackEvent } from '../utils/analytics';
import { IFeed } from '../utils/AppContext';
import { getSecureUrl } from '../utils/helpers';
import { INowPlaying } from './PlayerBar';
import { IFeedItem } from './Result';

/**
 * Loads the chosen episode into the persistent audio element.
 * Choosing that same episode again pauses it, or resumes it from where it stopped.
 */
export const useEpisodePlayer = (
  audioRef: { readonly current: HTMLAudioElement | null },
  selectedFeed: Signal<IFeed | null>,
  nowPlaying: Signal<INowPlaying | undefined>
): ((item: IFeedItem) => void) => {
  return useCallback((item: IFeedItem) => {
    const url: string = item.enclosure.link;

    if (!url) {
      trackEvent('exception', {
        description: `audio_missing_enclosure_${item.guid}`,
        fatal: false
      });
      return;
    }

    let secureUrl: string;

    try {
      secureUrl = getSecureUrl(url);
    } catch {
      trackEvent('exception', {
        description: `audio_unsafe_enclosure_${item.guid}`,
        fatal: false
      });
      return;
    }

    const audio = audioRef.current;
    const sameEpisode = nowPlaying.value?.guid === item.guid && Boolean(audio?.getAttribute('src'));

    if (audio && sameEpisode) {
      const isPlaying = !audio.paused;

      trackEvent('Audio', {
        eventAction: isPlaying ? 'pause' : 'play',
        eventLabel: secureUrl,
        transport: 'beacon'
      });

      if (isPlaying) {
        audio.pause();
      } else {
        void audio.play?.()?.catch(() => undefined);
      }
      return;
    }

    trackEvent('Audio', {
      eventAction: 'play',
      eventLabel: secureUrl,
      transport: 'beacon'
    });

    const podcast = selectedFeed.value;

    nowPlaying.value = {
      guid: item.guid,
      title: item.title,
      podcastName: podcast?.collectionName ?? '',
      artworkUrl: podcast?.artworkUrl100 ?? ''
    };

    if (audio) {
      audio.src = secureUrl;
      // Playback begins from the click that chose the episode, which is also what
      // mobile browsers require of a player that does not autoplay
      void audio.play?.()?.catch(() => undefined);
    }
  }, [audioRef, nowPlaying, selectedFeed]);
};
