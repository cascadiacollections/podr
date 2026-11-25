import { QueryClient, QueryClientProvider } from '@tanstack/preact-query';
import { ComponentChildren, h, JSX } from 'preact';
import { useState } from 'preact/hooks';

import { createPodrQueryClient } from './queryClient';

/**
 * A client that fails once and settles. Retry is off so tests do not wait
 * out the backoff, and each render gets its own cache.
 */
export function createTestQueryClient(): QueryClient {
  return createPodrQueryClient({ retry: false });
}

export function QueryTestProvider({ children }: { readonly children: ComponentChildren }): JSX.Element {
  const [client] = useState(createTestQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
