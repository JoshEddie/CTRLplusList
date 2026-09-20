'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useDismiss(
  onClose: (() => void) | undefined,
  closeHref: string | undefined
) {
  const router = useRouter();
  return () => {
    if (onClose) {
      onClose();
      return;
    }
    // Intercepted-route modals: prefer history-back so the @modal slot
    // unmounts back to default. Fall back to a hard navigation if we
    // were opened directly (no history entry to pop).
    /* v8 ignore next 2 -- SSR guard; window always defined under jsdom; the branch is a Next.js safety net. */
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      router.back();
      return;
    }
    if (closeHref) router.push(closeHref);
  };
}

// Outside-mousedown / Escape / scroll dismissal for popovers that are not a
// <dialog>. Scroll is the caller's own callback: an anchor hidden out from
// under an open popover (a collapsing sticky header, a closing accordion)
// fires no event of its own, and what counts as gone differs by surface.
// Capture phase because scroll does not bubble from nested scroll containers.
export function useOutsideDismiss({
  open,
  contains,
  dismiss,
  onScroll,
}: {
  open: boolean;
  contains: (target: Node) => boolean;
  dismiss: () => void;
  onScroll: () => void;
}) {
  const latest = useRef({ contains, dismiss, onScroll });
  useEffect(() => {
    latest.current = { contains, dismiss, onScroll };
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!latest.current.contains(event.target as Node)) latest.current.dismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') latest.current.dismiss();
    };
    const scroll = () => latest.current.onScroll();
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', scroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', scroll, { capture: true });
    };
  }, [open]);
}
