'use client';

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
