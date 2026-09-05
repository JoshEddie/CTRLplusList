'use client';

import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { FaArrowRightLong } from 'react-icons/fa6';
import { editModeSaveLabel } from './editModeChanges';

// Cancel is the only revert in this mode: with the whole edit staged behind one
// Save, a bulk Undo would be a second way to reach the state Cancel already
// restores, and there is no per-row undo for it to be consistent with.
export default function EditModeFooter({
  totalSelected,
  added,
  removed,
  isNew,
  canSave,
  isSubmitting,
  onCancel,
  onSave,
}: {
  totalSelected: number;
  added: number;
  removed: number;
  isNew: boolean;
  /** Whether Save may fire at all — a staged change (or the create pass-through) with no field in error. The diff line reports entries only. */
  canSave: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const hasEntryChanges = added > 0 || removed > 0;

  return (
    <div className="edit-mode-footer">
      <div className="edit-mode-count">
        {totalSelected > 0 ? (
          getMessage('edit_mode_count_selected', { count: totalSelected })
        ) : (
          <span className="edit-mode-count-muted">
            {getMessage('edit_mode_count_none')}
          </span>
        )}
        {!isNew && hasEntryChanges && (
          <span className="edit-mode-count-diff">
            {added > 0 && (
              <>
                {' · '}
                <span className="edit-mode-count-added">
                  {getMessage('edit_mode_count_added', { count: added })}
                </span>
              </>
            )}
            {removed > 0 && (
              <>
                {' · '}
                <span className="edit-mode-count-removed">
                  {getMessage('edit_mode_count_removed', { count: removed })}
                </span>
              </>
            )}
          </span>
        )}
      </div>
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
