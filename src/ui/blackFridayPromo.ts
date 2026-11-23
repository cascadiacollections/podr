import { readStoredJson, writeStoredJson } from '../utils/storage';

/**
 * Black Friday through Cyber Monday 2026.
 *
 * Change this object to move the promotion. `start` and `end` are inclusive
 * wall-clock times in `timeZone` (`YYYY-MM-DDTHH:mm:ss`). "Through 23:59"
 * keeps the whole last minute, so `end` is 23:59:59.
 *
 * Outside this window the banner renders nothing unless the page URL carries
 * `?promo=bf2026`, which is the preview switch.
 *
 * The hosted site serves Google Analytics (and Netlify's real-user monitoring)
 * and does not serve an ad unit, so the banner may say listening is free, with
 * no account and no ads. It must not say the site is tracking-free.
 */
export const BLACK_FRIDAY_PROMO = {
  id: 'bf2026',
  timeZone: 'America/Los_Angeles',
  start: '2026-11-27T00:00:00',
  end: '2026-12-01T23:59:59',
  previewParam: 'promo',
  previewValue: 'bf2026',
  storageKey: 'podr_promo_bf2026_dismissed',
} as const;

/**
 * `YYYY-MM-DDTHH:mm:ss` in `timeZone`, or null when `date` is invalid.
 *
 * Hour 24 (midnight on some Intl builds) rolls forward one calendar day so the
 * stamp stays comparable with {@link BLACK_FRIDAY_PROMO}.
 */
export function formatZonedTimestamp(date: Date, timeZone: string): string | null {
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};

  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  let hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);

  if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) {
    return null;
  }

  let stampYear = year;
  let stampMonth = month;
  let stampDay = day;

  if (hour === 24) {
    hour = 0;
    const rolled = new Date(Date.UTC(year, month - 1, day + 1));
    stampYear = rolled.getUTCFullYear();
    stampMonth = rolled.getUTCMonth() + 1;
    stampDay = rolled.getUTCDate();
  }

  const pad = (value: number): string => String(value).padStart(2, '0');

  return `${stampYear}-${pad(stampMonth)}-${pad(stampDay)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

/**
 * Whether `now` falls inside the promo window, inclusive of both ends.
 */
export function isWithinBlackFridayPromo(now: Date): boolean {
  const local = formatZonedTimestamp(now, BLACK_FRIDAY_PROMO.timeZone);

  if (!local) {
    return false;
  }

  return local >= BLACK_FRIDAY_PROMO.start && local <= BLACK_FRIDAY_PROMO.end;
}

/**
 * `?promo=bf2026` shows the banner outside the window. A fresh load of that
 * URL shows it again even after a stored dismissal, so the link keeps working
 * as a preview. Dismissing the preview itself is not stored.
 */
export function isBlackFridayPromoPreview(search: string): boolean {
  return new URLSearchParams(search).get(BLACK_FRIDAY_PROMO.previewParam) === BLACK_FRIDAY_PROMO.previewValue;
}

/**
 * Whether the visitor already dismissed the banner. Only read while the
 * scheduled window is open: a preview URL ignores this, and outside the
 * window the banner never consults storage.
 */
export function isBlackFridayPromoDismissed(): boolean {
  return readStoredJson<boolean>(BLACK_FRIDAY_PROMO.storageKey, false) === true;
}

/**
 * Remembers a dismissal in localStorage. No cookie is written.
 */
export function dismissBlackFridayPromo(): void {
  writeStoredJson(BLACK_FRIDAY_PROMO.storageKey, true);
}
