import { useEffect } from 'react';

export const SCROLL_LOCK_CLASS = 'has-open-sheet';

// Ref-counted because overlays nest (an AltvatarCustomizer opened over a
// form-shell): the inner one closing must not unlock the document while the
// outer one still owns the screen.
let openSheets = 0;

/** Holds the document's scroll while a fixed overlay owns the screen, for as
    long as the calling component's effects are mounted. Effect-driven rather
    than a `:has()` selector on the scrim: the App Router keeps the previous
    route's DOM mounted-but-hidden after a back navigation, so a structural
    selector goes on matching a scrim nobody can see. */
export function useScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    openSheets += 1;
    document.documentElement.classList.add(SCROLL_LOCK_CLASS);
    return () => {
      openSheets -= 1;
      if (openSheets === 0) {
        document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
      }
    };
  }, [active]);
}
