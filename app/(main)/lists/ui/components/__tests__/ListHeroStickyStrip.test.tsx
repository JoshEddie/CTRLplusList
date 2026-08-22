import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ListHeroStickyStrip from '../ListHeroStickyStrip';

// jsdom has no IntersectionObserver; capture the callback so tests can
// drive the stuck/unstuck transitions the observer would report.
type IOCallback = (entries: { isIntersecting: boolean }[]) => void;

let observerCallback: IOCallback;
let observed: Element[];
let disconnected: boolean;

beforeEach(() => {
  observed = [];
  disconnected = false;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IOCallback) {
        observerCallback = callback;
      }
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {
        disconnected = true;
      }
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderStrip() {
  return render(
    <ListHeroStickyStrip
      title="Birthday wishes"
      kebab={<button type="button">Menu</button>}
    />
  );
}

// The strip is inert (hidden from the a11y tree) until stuck; class and
// inert state are the observable contract here, so it is located by class.
function strip(container: HTMLElement) {
  return container.querySelector('.list-hero-collapsed-strip') as HTMLElement;
}

describe('ListHeroStickyStrip', () => {
  it('AtRest_StripIsInertAndNotStuck', () => {
    const { container } = renderStrip();
    const el = strip(container);
    expect(el).not.toHaveClass('is-stuck');
    expect(el).toHaveAttribute('inert');
  });

  it('SentinelLeavesViewport_StripBecomesStuckAndInteractive', () => {
    const { container } = renderStrip();
    act(() => observerCallback([{ isIntersecting: false }]));
    const el = strip(container);
    expect(el).toHaveClass('is-stuck');
    expect(el).not.toHaveAttribute('inert');
    expect(screen.getByText('Birthday wishes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('SentinelReturns_StripUnsticksAndGoesInertAgain', () => {
    const { container } = renderStrip();
    act(() => observerCallback([{ isIntersecting: false }]));
    act(() => observerCallback([{ isIntersecting: true }]));
    const el = strip(container);
    expect(el).not.toHaveClass('is-stuck');
    expect(el).toHaveAttribute('inert');
  });

  it('Mount_ObservesTheSentinelOnce', () => {
    renderStrip();
    expect(observed).toHaveLength(1);
    expect(observed[0]).toHaveClass('list-hero-strip-sentinel');
  });

  it('Unmount_DisconnectsTheObserver', () => {
    const { unmount } = renderStrip();
    unmount();
    expect(disconnected).toBe(true);
  });
});
