import { useSyncExternalStore } from 'react';

// "Am I on the client?" without tripping react-hooks/set-state-in-effect. An
// empty subscribe + true/false snapshot is the canonical useSyncExternalStore
// pattern for SSR-safe client detection.
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
/* v8 ignore next -- getServerSnapshot is only invoked by React during server-side rendering; the jsdom client test env always resolves getClientSnapshot. */
const getServerSnapshot = () => false;

export function useIsClient() {
  return useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot
  );
}
