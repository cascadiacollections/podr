import {
  BLACK_FRIDAY_PROMO,
  dismissBlackFridayPromo,
  formatZonedTimestamp,
  isBlackFridayPromoDismissed,
  isBlackFridayPromoPreview,
  isWithinBlackFridayPromo,
} from '../blackFridayPromo';

const losAngeles = (isoUtc: string): Date => new Date(isoUtc);

describe('Black Friday 2026 promo window', () => {
  test('keeps the scheduled window in one place', () => {
    expect(BLACK_FRIDAY_PROMO).toMatchObject({
      id: 'bf2026',
      timeZone: 'America/Los_Angeles',
      start: '2026-11-27T00:00:00',
      end: '2026-12-01T23:59:59',
      previewParam: 'promo',
      previewValue: 'bf2026',
      storageKey: 'podr_promo_bf2026_dismissed',
    });
  });

  test('rolls an Intl hour of 24 forward to the next calendar day', () => {
    const formatter = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () =>
        ({
          formatToParts: () => [
            { type: 'year', value: '2026' },
            { type: 'month', value: '11' },
            { type: 'day', value: '26' },
            { type: 'hour', value: '24' },
            { type: 'minute', value: '00' },
            { type: 'second', value: '00' },
          ],
        }) as Intl.DateTimeFormat
    );

    expect(formatZonedTimestamp(new Date('2026-11-27T08:00:00Z'), 'America/Los_Angeles')).toBe(
      '2026-11-27T00:00:00'
    );

    formatter.mockRestore();
  });

  test('formats Pacific wall time, including daylight saving', () => {
    expect(formatZonedTimestamp(losAngeles('2026-11-27T08:00:00Z'), 'America/Los_Angeles')).toBe(
      '2026-11-27T00:00:00'
    );
    // July is PDT (UTC-7), so the same clock is not a fixed offset.
    expect(formatZonedTimestamp(losAngeles('2026-07-15T19:00:00Z'), 'America/Los_Angeles')).toBe(
      '2026-07-15T12:00:00'
    );
    expect(formatZonedTimestamp(new Date(Number.NaN), 'America/Los_Angeles')).toBeNull();
  });

  test('is closed before 2026-11-27 00:00 Pacific and open at that instant', () => {
    expect(isWithinBlackFridayPromo(losAngeles('2026-11-27T07:59:59Z'))).toBe(false);
    expect(isWithinBlackFridayPromo(losAngeles('2026-11-27T08:00:00Z'))).toBe(true);
  });

  test('stays open through 2026-12-01 23:59 Pacific and closes at midnight', () => {
    expect(isWithinBlackFridayPromo(losAngeles('2026-11-29T20:00:00Z'))).toBe(true);
    expect(isWithinBlackFridayPromo(losAngeles('2026-12-02T07:59:59Z'))).toBe(true);
    expect(isWithinBlackFridayPromo(losAngeles('2026-12-02T08:00:00Z'))).toBe(false);
  });

  test('treats only ?promo=bf2026 as the preview switch', () => {
    expect(isBlackFridayPromoPreview('?promo=bf2026')).toBe(true);
    expect(isBlackFridayPromoPreview('promo=bf2026&feed=https://example.com/rss')).toBe(true);
    expect(isBlackFridayPromoPreview('?promo=BF2026')).toBe(false);
    expect(isBlackFridayPromoPreview('?promo=other')).toBe(false);
    expect(isBlackFridayPromoPreview('')).toBe(false);
  });

  test('remembers dismissal in localStorage and not in a cookie', () => {
    localStorage.clear();
    const cookieBefore = document.cookie;

    expect(isBlackFridayPromoDismissed()).toBe(false);

    dismissBlackFridayPromo();

    expect(isBlackFridayPromoDismissed()).toBe(true);
    expect(localStorage.getItem(BLACK_FRIDAY_PROMO.storageKey)).toBe('true');
    expect(document.cookie).toBe(cookieBefore);
  });
});
