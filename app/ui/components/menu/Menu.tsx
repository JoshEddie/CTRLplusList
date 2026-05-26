'use client';

import {
  AriaAttributes,
  forwardRef,
  ReactNode,
  RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import './menu.css';

type MenuProps = {
  open: boolean;
  onClose: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
} & Pick<AriaAttributes, 'aria-label' | 'aria-labelledby'>;

export const Menu = forwardRef<HTMLDivElement, MenuProps>(function Menu(
  { open, onClose, anchorRef, children, className, ...aria },
  ref
) {
  const localRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  // Outside-click / Escape dismiss. The check ignores clicks on the anchor
  // so that activating the trigger doesn't dismiss-then-reopen the menu.
  useEffect(() => {
    if (!open) return;
    const dismiss = () => {
      onClose();
      anchorRef?.current?.focus();
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (localRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      dismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const container = localRef.current;
    /* v8 ignore next -- defensive: localRef is always set when the popover DOM has mounted; effect is gated on open. */
    if (!container) return;

    const getItems = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          '[role^="menuitem"]:not([aria-disabled="true"])'
        )
      );

    const focusAt = (index: number) => {
      const items = getItems();
      const i = (index + items.length) % items.length;
      items[i]?.focus();
    };

    const onKey = (e: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      /* v8 ignore next -- jsdom never resolves document.activeElement to null (falls back to body). The `: -1` fallback exists because the DOM lib types `document.activeElement` as `Element | null`; real browsers always return an element, so the null branch is unreachable in tests. */
      const currentIndex = active ? items.indexOf(active) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusAt(currentIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusAt(currentIndex <= 0 ? items.length - 1 : currentIndex - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusAt(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        focusAt(items.length - 1);
      }
    };

    container.addEventListener('keydown', onKey);
    // Focus the first item on open so arrow keys are immediately useful
    // and the menu is operable by keyboard from the moment it appears.
    // `preventScroll: true` is critical — without it, a menu opening
    // offscreen (e.g. hover-opened upward when the trigger is near the
    // top of a scrollable container) yanks the page to bring the focused
    // item into view, shifting the trigger out from under the cursor.
    const items = getItems();
    items[0]?.focus({ preventScroll: true });
    return () => container.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={localRef}
      className={['menu-popover', className].filter(Boolean).join(' ')}
      role="menu"
      {...aria}
    >
      {children}
    </div>
  );
});
