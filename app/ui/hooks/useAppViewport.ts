import { useEffect } from 'react';

/* Publishes the visible band — the slice of the layout viewport not covered by
   the soft keyboard — as `--app-viewport-top` / `--app-viewport-height`.
   Read straight off visualViewport rather than derived from innerHeight: iOS
   shrinks innerHeight on a page that cannot scroll and leaves it full on one
   that can, so `innerHeight - vv.height` reports two different keyboard heights
   for the same keyboard. vv.height and vv.offsetTop are the band directly. */
export function useAppViewport(): void {
  useEffect(() => {
    /* v8 ignore next -- SSR short-circuit; window is always defined in jsdom. */
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let lastHeight = -1;
    let lastTop = -1;

    /* Written straight from the event, not through requestAnimationFrame,
       which lands a frame late. The equality guards keep this to a write only
       when a value really moved. */
    const update = () => {
      const height = Math.round(vv.height);
      const top = Math.round(vv.offsetTop);
      if (height !== lastHeight) {
        lastHeight = height;
        root.style.setProperty('--app-viewport-height', `${height}px`);
      }
      if (top !== lastTop) {
        lastTop = top;
        root.style.setProperty('--app-viewport-top', `${top}px`);
      }
    };

    /* `scroll` matters here where it did not for a derived height: the band's
       offset changes without a resize. It only moves surfaces pinned to the
       viewport, never the document's height, so it cannot feed back into
       another scroll the way resizing the frame did. */
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-viewport-top');
    };
  }, []);
}
