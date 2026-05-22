import { useEffect } from 'react';

export function useKeyboardOffset(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let rafId: number | null = null;

    const update = () => {
      rafId = null;
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--keyboard-offset', `${offset}px`);
    };

    const schedule = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(update);
    };

    schedule();
    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      vv.removeEventListener('resize', schedule);
      vv.removeEventListener('scroll', schedule);
      root.style.removeProperty('--keyboard-offset');
    };
  }, [enabled]);
}
