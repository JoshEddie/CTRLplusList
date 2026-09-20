'use client';

// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import { Button, CloseButton } from '@/app/ui/components/button';
import { useDismiss } from '@/app/ui/components/use-dismiss';
import { useScrollLock } from '@/app/ui/hooks/useScrollLock';
import '@/app/ui/styles/form-shell.css';

type Variant = 'default' | 'wide';

export function FormShell({
  variant = 'default',
  title,
  header,
  closeHref,
  onClose,
  children,
}: {
  variant?: Variant;
  title?: string;
  /** Chrome of its own in place of the title bar, for a form whose header
      carries something other than a title. A header given here owns its own
      close affordance. */
  header?: React.ReactNode;
  closeHref?: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const dismiss = useDismiss(onClose, closeHref);
  useScrollLock();

  const cls =
    variant === 'wide'
      ? 'modal-shell modal-shell-wide form-shell'
      : 'modal-shell form-shell';

  return (
    <div
      className="modal-overlay-scrim form-shell-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className={cls}>
        {header ?? (
          <div className="form-shell-hd">
            <span className="form-shell-title">{title}</span>
            <CloseButton onClick={dismiss} className="close-button--in-flow" />
          </div>
        )}
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
