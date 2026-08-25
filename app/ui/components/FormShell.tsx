'use client';

import { Button, CloseButton } from '@/app/ui/components/button';
import { useDismiss } from '@/app/ui/components/use-dismiss';
import '@/app/ui/styles/form-shell.css';

type Variant = 'default' | 'wide';

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
        <div className="form-shell-hd">
          <span className="form-shell-title">{title}</span>
          <CloseButton onClick={dismiss} className="close-button--in-flow" />
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
