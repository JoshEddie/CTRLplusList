'use client';

import { Button } from '@/app/ui/components/button';
import { useEffect, useRef } from 'react';
import '@/app/(main)/lists/ui/styles/following-and-history.css';

export default function FollowDisclosureDialog({
  open,
  ownerName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  ownerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    /* v8 ignore next -- defensive null-ref guard; dialogRef.current is always populated by the time the effect runs under React 19 + jsdom, so this branch is unreachable in tests. */
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      confirmRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="follow-disclosure-dialog"
      aria-labelledby="follow-disclosure-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClose={() => {
        if (open) onCancel();
      }}
    >
      <h3 id="follow-disclosure-title" className="follow-disclosure-title">
        Follow {ownerName}?
      </h3>
      <p className="follow-disclosure-body">
        Following someone shares your name and profile picture with them.
      </p>
      <div className="follow-disclosure-buttons">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button ref={confirmRef} variant="primary" onClick={onConfirm}>
          Follow
        </Button>
      </div>
    </dialog>
  );
}
