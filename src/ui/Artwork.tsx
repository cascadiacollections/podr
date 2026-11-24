import { FunctionComponent, h } from 'preact';

import { toSecureHttpUrl } from '../utils/helpers';

export interface IArtworkProps {
  /** Preferred image. A non-web URL is treated as missing. */
  readonly src: string;
  /** Optional higher-resolution source for a 2x srcset. */
  readonly largeSrc?: string;
  readonly className: string;
  readonly width: number;
  readonly height: number;
  readonly lazy?: boolean;
  readonly draggable?: boolean;
}

/**
 * Podcast artwork, or a sized stand-in when the feed has none.
 * The stand-in keeps the card, hero, and player from showing a broken image.
 */
export const Artwork: FunctionComponent<IArtworkProps> = ({
  src,
  largeSrc = '',
  className,
  width,
  height,
  lazy = true,
  draggable
}: IArtworkProps) => {
  const artwork = toSecureHttpUrl(src);
  const artworkLarge = toSecureHttpUrl(largeSrc);
  const shown = artwork || artworkLarge;

  if (!shown) {
    return (
      <span className={`${className} artwork-fallback`} aria-hidden="true">
        🎧
      </span>
    );
  }

  return (
    <img
      className={className}
      src={shown}
      srcSet={artwork && artworkLarge ? `${artwork} 1x, ${artworkLarge} 2x` : undefined}
      width={width}
      height={height}
      alt=""
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      draggable={draggable}
    />
  );
};
