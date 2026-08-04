import { renderHook } from '@testing-library/preact';
import { act } from 'preact/test-utils';

import {
  isConstrainedConnection,
  prefersReducedData,
  prefersReducedMotion,
  useOnlineStatus
} from '../network';

/**
 * Replaces navigator.connection for the duration of a test
 */
function setConnection(connection: unknown): void {
  Object.defineProperty(navigator, 'connection', {
    value: connection,
    configurable: true
  });
}

/**
 * Stubs matchMedia so a given query reports as matching
 */
function setMatchingQuery(matching: string | null): void {
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn().mockImplementation((query: string) => ({
      matches: matching !== null && query.includes(matching)
    })),
    configurable: true
  });
}

/**
 * Overrides navigator.onLine
 */
function setOnLine(onLine: boolean): void {
  Object.defineProperty(navigator, 'onLine', { value: onLine, configurable: true });
}

describe('network preferences', () => {
  afterEach(() => {
    setConnection(undefined);
    setMatchingQuery(null);
    setOnLine(true);
  });

  describe('prefersReducedData', () => {
    it('follows the browser data saver', () => {
      setConnection({ saveData: true });
      setMatchingQuery(null);

      expect(prefersReducedData()).toBe(true);
    });

    it('follows the reduced-data media query', () => {
      setConnection({ saveData: false });
      setMatchingQuery('prefers-reduced-data');

      expect(prefersReducedData()).toBe(true);
    });

    it('is false when neither is set', () => {
      setConnection({ saveData: false });
      setMatchingQuery(null);

      expect(prefersReducedData()).toBe(false);
    });

    it('tolerates a browser without the connection API', () => {
      setConnection(undefined);
      setMatchingQuery(null);

      expect(prefersReducedData()).toBe(false);
    });
  });

  describe('isConstrainedConnection', () => {
    it.each(['slow-2g', '2g', '3g'])('treats %s as constrained', (effectiveType: string) => {
      setConnection({ effectiveType });
      setMatchingQuery(null);

      expect(isConstrainedConnection()).toBe(true);
    });

    it('treats 4g as unconstrained', () => {
      setConnection({ effectiveType: '4g' });
      setMatchingQuery(null);

      expect(isConstrainedConnection()).toBe(false);
    });

    it('is constrained whenever data use should be reduced', () => {
      setConnection({ effectiveType: '4g', saveData: true });
      setMatchingQuery(null);

      expect(isConstrainedConnection()).toBe(true);
    });
  });

  describe('prefersReducedMotion', () => {
    it('follows the media query', () => {
      setMatchingQuery('prefers-reduced-motion');
      expect(prefersReducedMotion()).toBe(true);

      setMatchingQuery(null);
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('useOnlineStatus', () => {
    it('starts from navigator.onLine', () => {
      setOnLine(false);

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(false);
    });

    it('assumes online when the browser does not report it', () => {
      Object.defineProperty(navigator, 'onLine', { value: undefined, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current).toBe(true);
    });

    it('reacts to connectivity events', () => {
      setOnLine(true);

      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      expect(result.current).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      expect(result.current).toBe(true);
    });
  });
});
