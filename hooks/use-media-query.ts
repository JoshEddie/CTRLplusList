'use client';

import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      // SSR safety guard. React's useSyncExternalStore does not call
      // `subscribe` during server render — it calls `getServerSnapshot`
      // directly — so this branch is unreachable via React's API contract.
      // The no-op exists as defense-in-depth for any non-React caller.
      /* v8 ignore next 2 */
      if (typeof window === 'undefined') return () => {};

      const media = window.matchMedia(query);
      media.addEventListener('change', callback);
      return () => media.removeEventListener('change', callback);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
