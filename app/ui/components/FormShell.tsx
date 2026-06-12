'use client';

import { useRouter } from 'next/navigation';
import { LuX } from 'react-icons/lu';
import { Button } from '@/app/ui/components/button';
import '@/app/ui/styles/form-shell.css';

type Variant = 'default' | 'wide' | 'split';

function useDismiss(
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

export function FormShell({
  variant = 'default',
  title,
  closeHref,
  onClose,
  children,
}: {
  variant?: Variant;
  title: string;
  closeHref?: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const dismiss = useDismiss(onClose, closeHref);

  const cls =
    variant === 'split'
      ? 'form-shell form-shell-split'
      : variant === 'wide'
        ? 'form-shell form-shell-wide'
        : 'form-shell';

  return (
    <div
      className="form-shell-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className={cls}>
        <div className="form-shell-hd">
          <span className="form-shell-title">{title}</span>
          <button
            type="button"
            className="form-shell-close"
            onClick={dismiss}
            aria-label="Close"
          >
            <LuX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormShellFooter({
  cancelHref,
  onCancel,
  deleteSlot,
  submitLabel,
  isPending,
  submitDisabled,
}: {
  cancelHref?: string;
  onCancel?: () => void;
  deleteSlot?: React.ReactNode;
  submitLabel: string;
  isPending?: boolean;
  submitDisabled?: boolean;
}) {
  const dismiss = useDismiss(onCancel, cancelHref);

  return (
    <div className="form-shell-ft">
      <Button variant="ghost" onClick={dismiss}>
        Cancel
      </Button>
      <div className="form-shell-ft-right">
        {deleteSlot}
        <Button
          type="submit"
          variant="primary"
          isLoading={isPending}
          disabled={submitDisabled}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
