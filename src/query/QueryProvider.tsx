import { QueryClientProvider } from '@tanstack/preact-query';
import { PersistQueryClientProvider } from '@tanstack/preact-query-persist-client';
import { ComponentChildren, h, JSX } from 'preact';
import { useState } from 'preact/hooks';

import { createPodrQueryPersister, trimPersistedQueryData } from './persister';
import { createPodrQueryClient, QUERY_CACHE_BUSTER, QUERY_GC_TIME } from './queryClient';

/**
 * Devtools pull in a Solid runtime. The import sits inside the development
 * branch so the production build constant-folds it out of the bundle.
 */
function QueryDevtools(): JSX.Element | null {
  if (process.env.NODE_ENV === 'development') {
    // Kept inside this branch so the production build drops the module.
    // The devtools package brings its own UI runtime and must not ship.
    const loaded = require('@tanstack/preact-query-devtools') as typeof import('@tanstack/preact-query-devtools');
    const Devtools = loaded.PreactQueryDevtools;
    return <Devtools initialIsOpen={false} buttonPosition="bottom-left" />;
  }

  return null;
}

export interface IPodrQueryProviderProps {
  readonly children: ComponentChildren;
}

/**
 * Provides the query client.
 * Tests skip persistence: restoring is asynchronous and would make the
 * synchronous cached-episode assertions wait on localStorage.
 * Development also mounts the devtools; production does not.
 */
export function PodrQueryProvider({ children }: IPodrQueryProviderProps): JSX.Element {
  const [client] = useState(() => createPodrQueryClient());
  const [persister] = useState(() => createPodrQueryPersister());

  if (process.env.NODE_ENV === 'test') {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: QUERY_GC_TIME,
        buster: QUERY_CACHE_BUSTER,
        dehydrateOptions: {
          serializeData: trimPersistedQueryData
        }
      }}
    >
      {children}
      <QueryDevtools />
    </PersistQueryClientProvider>
  );
}
