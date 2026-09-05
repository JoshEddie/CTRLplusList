'use client';

// TODO(#343): extract the duplicated literal to a constant, then drop this disable
/* eslint-disable sonarjs/no-duplicate-string */

import { useEffect, useRef, type ReactNode } from 'react';

export const HERO_TOOLBAR_SLOT_ID = 'list-hero-toolbar-slot';
export const HERO_SLOT_READY_EVENT = 'list-hero-slot-ready';

const SUSTAINED_PX = 40;
const EXPAND_TRAVEL_PX = 350;
const QUIET_MS = 500;

type ListHeroSurfaceProps = {
  title: string;
  kebab: ReactNode;
  children: ReactNode;
};

export default function ListHeroSurface({ title, kebab, children }: ListHeroSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    const sentinel = sentinelRef.current;
    /* v8 ignore next -- refs are always attached once effects run; guard is for the compiler, not a reachable branch. */
    if (!surface || !sentinel) return;

    // Sticky is armed only here so a page without JS keeps the plain
    // in-flow hero; classes are written straight to the DOM because React
    // state would re-render the server subtrees passed in as props.
    surface.classList.add('is-chrome');

    // Imperative, not JSX: the slot must be absent from server HTML so a
    // portal landing in it before hydration has no hydration surface to break.
    const slot = document.createElement('div');
    slot.id = HERO_TOOLBAR_SLOT_ID;
    surface.appendChild(slot);
    window.dispatchEvent(new Event(HERO_SLOT_READY_EVENT));

    // The sentinel sits above the hero and never animates, so its rect.top is
    // a clean scroll signal even while the surface's own height transitions.
    let lastSentinelTop = sentinel.getBoundingClientRect().top;
    let upBank = 0;
    let downBank = 0;

    const settle = () => {
      upBank = 0;
      downBank = 0;
    };

    // A soft keyboard doesn't just displace the visual viewport — the
    // browser also genuinely auto-scrolls the document to reveal the focused
    // field, and in standalone/PWA mode the keyboard resizes the viewport
    // without moving offsetTop. Those ticks look like real scrolls, so a
    // per-tick offset comparison can't catch them. Instead a quiet window
    // swallows and re-baselines scroll ticks so they never swap the hero.
    // It opens on focus/blur of a keyboard-summoning element — iOS runs the
    // reveal auto-scroll BEFORE the first visualViewport event, so waiting
    // for viewport geometry alone reacts too late — and every viewport
    // geometry event extends it while the keyboard animation keeps emitting.
    let quietUntil = 0;
    const enterQuiet = () => {
      quietUntil = performance.now() + QUIET_MS;
      lastSentinelTop = sentinel.getBoundingClientRect().top;
      settle();
    };
    const onFocusChange = (event: FocusEvent) => {
      if (
        event.target instanceof Element &&
        event.target.matches('input, textarea, select, [contenteditable]')
      ) {
        enterQuiet();
      }
    };
    window.visualViewport?.addEventListener('resize', enterQuiet);
    window.visualViewport?.addEventListener('scroll', enterQuiet);
    window.addEventListener('focusin', onFocusChange);
    window.addEventListener('focusout', onFocusChange);

    const onScroll = () => {
      const sentinelTop = sentinel.getBoundingClientRect().top;

      // Sticky pinning holds surface.top at the live nav offset while the
      // sentinel keeps scrolling, so this gap is px-past-pin with no cached
      // breakpoint constants.
      const pinnedDepth = surface.getBoundingClientRect().top - sentinelTop;

      // Being at the pin is a position, not a gesture, so it outranks both
      // the banks and the quiet window: a tick swallowed by an overscroll
      // bounce or a keyboard must never leave the page at the top with the
      // hero collapsed.
      if (pinnedDepth <= 0) {
        lastSentinelTop = sentinelTop;
        settle();
        surface.classList.remove('is-collapsed');
        return;
      }

      if (performance.now() < quietUntil) {
        lastSentinelTop = sentinelTop;
        return;
      }

      const delta = lastSentinelTop - sentinelTop;
      lastSentinelTop = sentinelTop;
      if (delta === 0) return;

      if (delta > 0) {
        downBank += delta;
        if (downBank > SUSTAINED_PX) upBank = 0;
      } else {
        upBank -= delta;
        downBank = 0;
      }

      const collapsed = surface.classList.contains('is-collapsed');

      if (collapsed && upBank > EXPAND_TRAVEL_PX) {
        surface.classList.remove('is-collapsed');
        settle();
      } else if (!collapsed && downBank > SUSTAINED_PX && pinnedDepth > SUSTAINED_PX) {
        surface.classList.add('is-collapsed');
        settle();
      }
    };

    // Element scroll events don't bubble; the capture phase still passes
    // through window for every scroll container.
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.visualViewport?.removeEventListener('resize', enterQuiet);
      window.visualViewport?.removeEventListener('scroll', enterQuiet);
      window.removeEventListener('focusin', onFocusChange);
      window.removeEventListener('focusout', onFocusChange);
      surface.classList.remove('is-chrome', 'is-collapsed');
      slot.remove();
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="list-hero-strip-sentinel" aria-hidden />
      <div ref={surfaceRef} className="list-hero-chrome">
        <div className="list-hero-shape">
          <div className="list-hero-layer-clip">{children}</div>
          <div className="list-hero-layer-collapsed">
            <h1 className="list-hero-collapsed-title">{title}</h1>
            <div className="list-hero-collapsed-trailing">{kebab}</div>
          </div>
        </div>
      </div>
    </>
  );
}
