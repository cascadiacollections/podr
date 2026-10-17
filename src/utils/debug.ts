/**
 * Development-only debug tooling. Imported first from src/index.tsx so the
 * hooks are in place before any component module or signal is created.
 *
 * Everything sits behind `process.env.NODE_ENV !== 'production'`, which webpack
 * replaces with `false` in production mode; the branch and every `require` in it
 * are dropped from the bundle. Production keeps only `preact/devtools` (~1 KB) so
 * the Preact DevTools extension can still attach to the live site.
 *
 * Always on in development:
 * - preact/debug: devtools hook, prop/hook misuse warnings, component stacks
 *
 * Opt-in, via `?debug=renders,signals` or `localStorage.podrDebug = 'renders,signals'`:
 * - renders: log every component re-render with the props that changed
 * - signals: @preact/signals-debug console tracing of signal/computed/effect updates
 *
 * See docs/DEBUGGING.md.
 */

/** Parse the enabled debug flags from the URL and localStorage. */
export function debugFlags(search: string, stored: string | null): Set<string> {
  const flags = new Set<string>();
  const add = (value: string | null): void => {
    (value ?? '')
      .split(',')
      .map((flag) => flag.trim().toLowerCase())
      .filter(Boolean)
      .forEach((flag) => flags.add(flag));
  };
  add(new URLSearchParams(search).get('debug'));
  add(stored);
  if (flags.has('all') || flags.has('1')) {
    flags.add('renders');
    flags.add('signals');
  }
  return flags;
}

function readStoredFlags(): string | null {
  try {
    return window.localStorage.getItem('podrDebug');
  } catch {
    return null;
  }
}

if (process.env.NODE_ENV !== 'production') {
  require('preact/debug');

  if (typeof window !== 'undefined') {
    const flags = debugFlags(window.location.search, readStoredFlags());

    if (flags.has('signals')) {
      require('@preact/signals-debug');
    }
    if (flags.has('renders')) {
      require('./renderLogger').installRenderLogger();
    }
    if (flags.size > 0) {
      console.info(
        `[podr debug] enabled: ${[...flags].join(', ')}. ` +
          `Turn off with localStorage.removeItem('podrDebug') and drop ?debug from the URL.`
      );
    }
  }
} else {
  require('preact/devtools');
}
