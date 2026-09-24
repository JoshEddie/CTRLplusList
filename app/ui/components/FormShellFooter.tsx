'use client';

import { Button } from '@/app/ui/components/button';
import { useDismiss } from '@/app/ui/components/use-dismiss';
import '@/app/ui/styles/form-shell.css';

export default function FormShellFooter({
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
