'use client';

import { ReactNode, useEffect, useRef } from 'react';

export const HERO_TOOLBAR_SLOT_ID = 'list-hero-toolbar-slot';
export const HERO_SLOT_READY_EVENT = 'list-hero-slot-ready';

// Sticky is armed via .is-chrome only once JS runs, so without JS the page
// keeps the plain in-flow hero. Flags are written straight to the DOM rather
// than held in state: re-rendering on every flip would re-walk the
// server-rendered subtrees passed in as props.
export default function ListHeroChrome({
  title,
  kebab,
  children,
}: {
  title: string;
  kebab: ReactNode;
  children: ReactNode;
}) {
  const chromeRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chrome = chromeRef.current;
    const sentinel = sentinelRef.current;
    /* v8 ignore next -- refs are always attached once effects run; guard is for the compiler, not a reachable branch. */
    if (!chrome || !sentinel) return;
    chrome.classList.add('is-chrome');
    // The slot is built here rather than rendered as JSX so it never reaches
    // the server HTML. The items section hydrates on its own schedule and
    // portals its toolbar in the moment it finds the slot — a server-rendered
    // slot can therefore gain a child before this subtree hydrates, and React
    // fails hydration on the unexpected node. A slot React never rendered has
    // no hydration surface at all. Announce it so an ItemsBrowser that
    // mounted first re-checks.
    const slot = chrome.appendChild(document.createElement('div'));
    slot.id = HERO_TOOLBAR_SLOT_ID;
    window.dispatchEvent(new Event(HERO_SLOT_READY_EVENT));
    // .is-animating gates overflow clipping to the transition window so the
    // expanded hero's kebab dropdown can still overflow the surface at rest.
    const setCollapsed = (isCollapsed: boolean) => {
      if (chrome.classList.contains('is-collapsed') === isCollapsed) return;
      chrome.classList.toggle('is-collapsed', isCollapsed);
      chrome.classList.add('is-animating');
    };
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'grid-template-rows') {
        chrome.classList.remove('is-animating');
      }
    };
    chrome.addEventListener('transitionend', onTransitionEnd);
    // Computed `top` resolves the calc()/env() chain to px, so the handler
    // tracks the responsive nav height without re-measuring the nav itself.
    const stickyTop = Number.parseFloat(getComputedStyle(chrome).top) || 0;
    // A single wheel tick shouldn't swap the hero out. Collapsing waits until
    // the surface is a little past its pinned position; expanding waits for a
    // sustained upward gesture rather than firing on the first tick back.
    const COLLAPSE_PAST = 40;
    const EXPAND_TRAVEL = 500;
    // The sentinel's rect gives position and direction in one read: its top
    // rising means the user is scrolling up. It works the same whichever
    // container actually scrolls. The sentinel sits ABOVE the chrome in
    // flow, so the swap changing the chrome's height never moves it — no
    // feedback loop.
    let lastTop = sentinel.getBoundingClientRect().top;
    // Banked upward travel for the current run. Any downward movement zeroes
    // it, so a flick back mid-gesture doesn't count toward the next expand.
    let upTravel = 0;
    const onScroll = () => {
      const top = sentinel.getBoundingClientRect().top;
      const delta = top - lastTop;
      // Scroll in an unrelated container (modal, dropdown) — ignore.
      if (delta === 0) return;
      lastTop = top;
      upTravel = delta > 0 ? upTravel + delta : 0;
      if (top >= stickyTop || upTravel > EXPAND_TRAVEL) {
        setCollapsed(false);
      } else if (top < stickyTop - COLLAPSE_PAST) {
        setCollapsed(true);
      }
    };
    // Element scroll events don't bubble; the capture phase still passes
    // through window for every scroll container.
    window.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true });
      chrome.removeEventListener('transitionend', onTransitionEnd);
      chrome.classList.remove('is-chrome', 'is-collapsed', 'is-animating');
      slot.remove();
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="list-hero-strip-sentinel" aria-hidden />
      <div ref={chromeRef} className="list-hero-chrome">
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
