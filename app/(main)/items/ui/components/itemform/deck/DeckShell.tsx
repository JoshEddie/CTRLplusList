'use client';

// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CloseButton } from '@/app/ui/components/button';
import { useDismiss } from '@/app/ui/components/use-dismiss';
import './deck-screen.css';

type Variant = 'default' | 'wide';

export function DeckShell({
  moduleTitle,
  variant = 'default',
  closeHref,
  onClose,
  children,
}: {
  moduleTitle: string;
  variant?: Variant;
  closeHref?: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const dismiss = useDismiss(onClose, closeHref);

  const cls =
    variant === 'wide'
      ? 'modal-shell modal-shell-wide deck-screen'
      : 'modal-shell deck-screen';

  return (
    <div
      className="modal-overlay-scrim deck-screen-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className={cls}>
        <CloseButton onClick={dismiss} className="deck-screen-close-pivot" />
        <span className="deck-screen-module-title">{moduleTitle}</span>
        {children}
      </div>
    </div>
  );
}

// Three regions inside the shell box: pinned header, scrolling well, pinned
// footer. A fragment (not a wrapper) so the regions stay direct flex children
// of .deck-screen.
export function DeckScreen({
  title,
  subtitle,
  foot,
  children,
}: {
  title?: string;
  subtitle?: ReactNode;
  foot?: ReactNode;
  children?: ReactNode;
}) {
  const wellRef = useRef<HTMLDivElement>(null);
  const [shadows, setShadows] = useState({ top: false, bottom: false });

  const syncShadows = useCallback(() => {
    const el = wellRef.current;
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setShadows((prev) =>
      prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
    );
  }, []);

  // No dependency array: content edits (an error banner appearing, a photo
  // loading in) change scrollHeight without firing a scroll event.
  useEffect(syncShadows);

  useEffect(() => {
    window.addEventListener('resize', syncShadows);
    return () => window.removeEventListener('resize', syncShadows);
  }, [syncShadows]);

  return (
    <>
      {(title || subtitle) && (
        <div
          className={`deck-screen-hd${shadows.top ? ' deck-screen-hd-shadow' : ''}`}
        >
          {title && <h2 className="deck-screen-title">{title}</h2>}
          {subtitle && <p className="deck-screen-sub">{subtitle}</p>}
        </div>
      )}
      {children && (
        <div ref={wellRef} className="deck-screen-well" onScroll={syncShadows}>
          {children}
        </div>
      )}
      {foot && (
        <div
          className={`deck-screen-ft${shadows.bottom ? ' deck-screen-ft-shadow' : ''}`}
        >
          {foot}
        </div>
      )}
    </>
  );
}
