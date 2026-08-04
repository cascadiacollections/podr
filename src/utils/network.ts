import { useEffect, useState } from 'preact/hooks';

/**
 * The subset of NetworkInformation this app reacts to.
 * Not in every browser, so every read is guarded.
 */
interface NetworkInformation {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

declare global {
  interface Navigator {
    readonly connection?: NetworkInformation;
  }
}

/**
 * Connection types slow enough that optional work should be skipped
 */
const SLOW_EFFECTIVE_TYPES: ReadonlySet<string> = new Set(['slow-2g', '2g', '3g']);

/**
 * Reads the current connection hints, if the browser exposes them
 */
function getConnection(): NetworkInformation | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.connection;
}

/**
 * Whether the user asked for reduced data use, through either the browser's
 * data saver or the operating system's reduced-data preference.
 *
 * When true the app skips optional network work and requests smaller artwork.
 * @returns True when data use should be minimized
 */
export function prefersReducedData(): boolean {
  if (getConnection()?.saveData) {
    return true;
  }

  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-data: reduce)').matches
  );
}

/**
 * Whether the connection is metered or slow enough to warrant skipping
 * non-essential requests such as background refreshes.
 * @returns True when optional requests should be skipped
 */
export function isConstrainedConnection(): boolean {
  if (prefersReducedData()) {
    return true;
  }

  const effectiveType = getConnection()?.effectiveType;

  return typeof effectiveType === 'string' && SLOW_EFFECTIVE_TYPES.has(effectiveType);
}

/**
 * Whether the user has asked for reduced motion.
 * Consulted before any scripted scrolling.
 * @returns True when motion should be avoided
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Tracks connectivity so the UI can explain itself when requests cannot be made.
 *
 * Starts optimistic: `navigator.onLine` reports false for some captive portals and
 * virtual adapters, and a wrong "you are offline" is worse than a missing one.
 * @returns True while the browser believes it has a connection
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean'
      ? true
      : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = (): void => setIsOnline(true);
    const handleOffline = (): void => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
