import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '../use-media-query';

type Listener = (event: { matches: boolean }) => void;

type FakeMql = {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
  __listeners: Listener[];
};

function makeMql(matches: boolean, media: string): FakeMql {
  const mql: FakeMql = {
    matches,
    media,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    __listeners: [],
  };
  mql.addEventListener.mockImplementation((event: string, cb: Listener) => {
    if (event === 'change') mql.__listeners.push(cb);
  });
  mql.removeEventListener.mockImplementation((event: string, cb: Listener) => {
    if (event === 'change') {
      mql.__listeners = mql.__listeners.filter((l) => l !== cb);
    }
  });
  return mql;
}

describe('useMediaQuery', () => {
  let mqls: Map<string, FakeMql>;
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    mqls = new Map();
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn((query: string) => {
      let mql = mqls.get(query);
      if (!mql) {
        mql = makeMql(false, query);
        mqls.set(query, mql);
      }
      return mql as unknown as MediaQueryList;
    }) as typeof window.matchMedia;
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    } else {
      // @ts-expect-error — jsdom default has no matchMedia
      delete window.matchMedia;
    }
  });

  it('InitialMqlMatchesTrue_ReturnsTrue', () => {
    const q = '(max-width: 768px)';
    mqls.set(q, makeMql(true, q));
    const { result } = renderHook(() => useMediaQuery(q));
    expect(result.current).toBe(true);
  });

  it('InitialMqlMatchesFalse_ReturnsFalse', () => {
    const q = '(max-width: 768px)';
    mqls.set(q, makeMql(false, q));
    const { result } = renderHook(() => useMediaQuery(q));
    expect(result.current).toBe(false);
  });

  it('Mount_SubscribesToChangeEventOnMql', () => {
    const q = '(max-width: 768px)';
    renderHook(() => useMediaQuery(q));
    const mql = mqls.get(q);
    expect(mql).toBeDefined();
    expect(mql?.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('MqlChangeEventEmitted_UpdatesReturnedValueToNewMatches', () => {
    const q = '(max-width: 768px)';
    const mql = makeMql(false, q);
    mqls.set(q, mql);
    const { result } = renderHook(() => useMediaQuery(q));
    expect(result.current).toBe(false);

    act(() => {
      mql.matches = true;
      for (const l of mql.__listeners) l({ matches: true });
    });
    expect(result.current).toBe(true);
  });

  it('Unmount_RemovesChangeListenerFromMql', () => {
    const q = '(max-width: 768px)';
    const { unmount } = renderHook(() => useMediaQuery(q));
    const mql = mqls.get(q);
    expect(mql?.__listeners.length).toBe(1);

    unmount();
    expect(mql?.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
    expect(mql?.__listeners.length).toBe(0);
  });

  it('QueryArgChanges_RemovesOldListenerAndSubscribesNewMql', () => {
    const q1 = '(max-width: 768px)';
    const q2 = '(min-width: 1000px)';
    const { rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: q1 },
    });
    const mql1 = mqls.get(q1)!;
    expect(mql1.__listeners.length).toBe(1);

    rerender({ query: q2 });
    expect(mql1.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
    const mql2 = mqls.get(q2)!;
    expect(mql2.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  // SSR-safe branches (`typeof window === 'undefined'` in subscribe;
  // `() => false` server snapshot) are covered by hooks/use-media-query.server.test.ts
  // which runs under the node project and renders the hook via react-dom/server.
});
