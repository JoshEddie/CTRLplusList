'use client';

import { Button } from '@/app/ui/components/button';
import type { ButtonVariant } from '@/app/ui/components/button/types';
import '@/app/(main)/lists/ui/styles/confirm-dialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /**
   * Optional reversible-alternative action. Rendered as a full-width button
   * above the Cancel/Confirm row — the recommended path when destructive
   * Confirm is not the right call.
   */
  tertiary?: {
    label: string;
    onClick: () => void;
    /** Visual weight. Defaults to 'primary' for strong nudges; pass
     *  'secondary' for soft offers (e.g. when there's nothing irrecoverable
     *  at stake). */
    variant?: Extract<ButtonVariant, 'primary' | 'secondary'>;
  };
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tertiary,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog-content">
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-buttons">
          {tertiary && (
            <Button
              variant={tertiary.variant ?? 'primary'}
              onClick={() => {
                tertiary.onClick();
                onClose();
              }}
            >
              {tertiary.label}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
