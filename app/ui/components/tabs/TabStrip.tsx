'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  KeyboardEventHandler,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import type { TabsSize } from './types';
import './tabs.css';

// The fit has to be decided before paint or every narrow load flashes a
// horizontal strip; `useLayoutEffect` warns when it runs during SSR, where
// there is nothing to measure anyway.
const useFitEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function TabStrip({
  role,
  size = 'default',
  className,
  onKeyDown,
  children,
  'aria-label': ariaLabel,
}: {
  role: 'navigation' | 'tablist';
  size?: TabsSize;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  children: ReactNode;
  'aria-label': string;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const rowWidth = useRef(0);

  // A container query can only compare the strip to a length written by hand,
  // and no hand-written length knows how wide "Recently visited" or "Active
  // (1215)" renders. `scroll-state()` would ask the strip itself but ships in
  // Chromium only, so the row is measured instead.
  useFitEffect(() => {
    const shell = shellRef.current;
    const tabs = tabsRef.current;
    /* v8 ignore next -- refs are attached to unconditional JSX, so both are populated by the time any effect runs. */
    if (!shell || !tabs) return;
    const fit = () => {
      // Only the horizontal layout describes the row being fitted; collapsed,
      // the cells are stacked and `scrollWidth` measures a column.
      if (!collapsed) rowWidth.current = tabs.scrollWidth;
      // With no active cell there is no face to collapse into, and a list of
      // every option and no current one says less than the strip does.
      const face = tabs.querySelector('[aria-current="page"],[aria-selected="true"]');
      setCollapsed(face !== null && shell.clientWidth < rowWidth.current);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [collapsed, children]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) =>
      event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Collapsed, the active cell is the face and opens the list. Expanded, this
  // is inert: `data-open` is only read under `[data-collapsed]`, and activating
  // the tab you are already on is a no-op.
  const onClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const face = (event.target as HTMLElement).closest(
      '[aria-current="page"],[aria-selected="true"]'
    );
    if (!face || !collapsed) {
      setOpen(false);
      return;
    }
    event.preventDefault();
    setOpen((wasOpen) => !wasOpen);
  };

  return (
    <div
      ref={shellRef}
      className={['tabs-shell', className].filter(Boolean).join(' ')}
      data-collapsed={collapsed || undefined}
      data-open={open || undefined}
    >
      <div className="tabStrip">
        <div
          ref={tabsRef}
          role={role}
          className={`tabs tabs--${size}`}
          aria-label={ariaLabel}
          onKeyDown={onKeyDown}
          onClick={onClick}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
