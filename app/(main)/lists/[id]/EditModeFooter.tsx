'use client';

import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import type { ReactNode } from 'react';
import { FaArrowRightLong } from 'react-icons/fa6';
import { editModeSaveLabel } from './editModeChanges';

// Cancel is the only revert in this mode: with the whole edit
// staged behind one Save, a bulk Undo would be a second way to reach the state
// Cancel already restores, and every marked row can be put back by hand.
export default function EditModeFooter({
  changeCount,
  pager,
  totalSelected,
  isNew,
  canSave,
  isSubmitting,
  onCancel,
  onSave,
}: {
  changeCount: number;
  pager?: ReactNode;
  totalSelected: number;
  isNew: boolean;
  /** Whether Save may fire at all — a staged change, or the create pass-through. */
  canSave: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="edit-mode-footer">
      <span className="edit-mode-count">
        {getMessage('edit_mode_change_count', { count: changeCount })}
      </span>
      {pager && <div className="edit-mode-footer-pager">{pager}</div>}
      <div className="edit-mode-footer-actions">
        <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          {getMessage(
            isNew ? 'edit_mode_skip_label' : 'edit_mode_cancel_label'
          )}
        </Button>
        <Button
          variant="primary"
          onClick={onSave}
          disabled={!canSave}
          isLoading={isSubmitting}
        >
          {editModeSaveLabel(isNew, totalSelected)} <FaArrowRightLong />
        </Button>
      </div>
    </div>
  );
}
