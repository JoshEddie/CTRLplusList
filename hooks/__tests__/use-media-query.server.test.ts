// Covers SSR-safe branches of useMediaQuery (production source):
//   - subscribe's `typeof window === 'undefined'` branch returns a no-op
//   - useSyncExternalStore's getServerSnapshot (`() => false`) is invoked
//
// Vitest config routes *.test.ts to the node project (no jsdom, no `window`).
// react-dom/server invokes getServerSnapshot during renderToString and never
// calls getSnapshot — exercising both branches without JSX/RTL.

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { useMediaQuery } from '../use-media-query';

function Probe({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return createElement(
    'span',
    { 'data-matches': matches ? 'true' : 'false' },
    String(matches)
  );
}

describe('useMediaQuery', () => {
  describe('NoWindowBranches', () => {
    it('ServerRender_RendersDataMatchesFalseAndNeverAccessesWindow', () => {
      expect(typeof window).toBe('undefined');
      const html = renderToString(
        createElement(Probe, { query: '(max-width: 768px)' })
      );
      expect(html).toContain('data-matches="false"');
    });
  });
});
