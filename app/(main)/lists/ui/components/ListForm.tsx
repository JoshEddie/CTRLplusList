'use client';

import { createList, updateList } from '@/lib/data/list.actions';
import { FieldError } from '@/app/ui/components/field';
import { FormShell, FormShellFooter } from '@/app/ui/components/FormShell';
import { ActionResponse, ListTable } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import DeleteListButton from './DeleteListButton';
import ListDetailsFields from './ListDetailsFields';
import {
  detailsChanged,
  type ListDetailsDraft,
} from '../../[id]/editModeChanges';
import { dateFieldError, dateInputValue } from './utils';

interface ListFormProps {
  list?: ListTable;
  isEditing?: boolean;
  // The active profile's name, supplied only for a viewer who runs more than
  // one. Creating writes the new list to whichever profile the request acts
  // as, so the form says which — a viewer with a single profile is shown no
  // statement that could only name themselves.
  actingAs?: string;
  // Deleting the list takes the owner floor, which the form itself never
  // reads: it renders the control and the surface that opened it says whether
  // the acting role clears the floor.
  deleteDisabled?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

const initialState: ActionResponse = {
  success: false,
  message: '',
  errors: undefined,
};

export default function ListForm({
  list,
  isEditing = false,
  actingAs,
  deleteDisabled = false,
  onClose,
  onSuccess,
}: ListFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<ListDetailsDraft>(() => ({
    name: list?.name ?? '',
    subtitle: list?.subtitle ?? '',
    occasion: list?.occasion ?? '',
    date: list?.date ? dateInputValue(list.date) : '',
  }));

  // Derived, not state: the field reports its own error as the value changes,
  // and the action reads the same value rather than a second copy.
  const dateError = dateFieldError(draft.date);

  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async () => {
    if (dateError) {
      return {
        success: false,
        message: 'Please correct the errors below',
        errors: { date: ['Invalid date'] },
      };
    }

    const rawSubtitle = draft.subtitle.trim();
    const data = {
      name: draft.name,
      subtitle: rawSubtitle === '' ? null : rawSubtitle,
      occasion: draft.occasion,
      date: new Date(draft.date),
    };

    // Pristine edit submits skip the round-trip entirely; the server-side
    // no-op guard in updateList remains the authority (list-update-recency).
    const pristine =
      isEditing && list !== undefined && !detailsChanged(draft, list);

    try {
      const result = pristine
        ? { success: true, message: '', id: list.id }
        : isEditing
          ? await updateList(list!.id, data)
          : await createList(data);

      if (result.success) {
        if (isEditing) {
          onSuccess?.();
          if (onClose) {
            onClose();
            router.refresh();
          } else {
            router.push(`/lists/${result.id}`);
          }
        } else {
          router.push(`/lists/${result.id}?edit=1&new=1`);
        }
      }

      return result;
    } catch (err) {
      return {
        success: false,
        message: (err as Error).message || 'An error occurred',
        errors: undefined,
      };
    }
  }, initialState);

  const closeHref = isEditing && list ? `/lists/${list.id}` : '/lists';
  const forProfile = !isEditing && actingAs ? ` for ${actingAs}` : '';

  return (
    <FormShell
      title={isEditing ? 'Edit List' : `New List${forProfile}`}
      closeHref={onClose ? undefined : closeHref}
      onClose={onClose}
    >
      <form action={formAction}>
        <div className="form-shell-body">
          {state?.message && !state.success && (
            <div style={{ marginBottom: 12 }}>
              <FieldError>{state.message}</FieldError>
            </div>
          )}
          <ListDetailsFields
            draft={draft}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            disabled={isPending}
            dateError={
              dateError ??
              (state?.errors?.date ? state.errors.date.join(', ') : undefined)
            }
          />
        </div>

        <FormShellFooter
          cancelHref={onClose ? undefined : closeHref}
          onCancel={onClose}
          submitLabel={isEditing ? 'Update List' : `Create List${forProfile}`}
          isPending={isPending}
          deleteSlot={
            isEditing && list ? (
              <DeleteListButton id={list.id} disabled={deleteDisabled} />
            ) : undefined
          }
        />
      </form>
    </FormShell>
  );
}
