'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

// Document-flow replacement for the stored-state hero collapse: the full
// hero scrolls away naturally and this strip pins below the app nav. The
// IntersectionObserver is cosmetic only — it flips the reveal styling when
// the strip is actually pinned; layout never depends on it, and without JS
// the strip simply stays hidden while the page still scrolls normally.
export default function ListHeroStickyStrip({
  title,
  kebab,
}: {
  title: string;
  kebab: ReactNode;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const strip = stripRef.current;
    const sentinel = sentinelRef.current;
    /* v8 ignore next -- refs are always attached once effects run; guard is for the compiler, not a reachable branch. */
    if (!strip || !sentinel) return;
    // The sentinel sits at the strip's natural position; once it passes the
    // strip's own sticky offset the strip is pinned. Computed `top` resolves
    // the calc()/env() chain to px, so the observer tracks the responsive
    // nav height without a scroll handler.
    const stickyTop = Number.parseFloat(getComputedStyle(strip).top) || 0;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: `${-Math.ceil(stickyTop) - 1}px 0px 0px 0px` }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="list-hero-strip-sentinel" aria-hidden />
      <div
        ref={stripRef}
        className={`list-hero-collapsed-strip${stuck ? ' is-stuck' : ''}`}
        inert={!stuck}
      >
        <p className="list-hero-collapsed-title">{title}</p>
        <div className="list-hero-collapsed-trailing">{kebab}</div>
      </div>
    </>
  );
}
