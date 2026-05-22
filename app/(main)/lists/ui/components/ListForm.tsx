'use client';

import { ActionResponse, createList, updateList } from '@/app/actions/lists';
import {
  DatalistField,
  DateField,
  FieldError,
  TextField,
} from '@/app/ui/components/field';
import { FormShell, FormShellFooter } from '@/app/ui/components/FormShell';
import { ListTable } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useActionState, useState } from 'react';
import DeleteListButton from './DeleteListButton';

interface ListFormProps {
  list?: ListTable;
  isEditing?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

const commonOccasions = [
  'Birthday',
  'Christmas',
  'Wedding',
  'Anniversary',
  'Baby Shower',
  'Graduation',
];

const initialState: ActionResponse = {
  success: false,
  message: '',
  errors: undefined,
};

export default function ListForm({
  list,
  isEditing = false,
  onClose,
  onSuccess,
}: ListFormProps) {
  const router = useRouter();
  const [selectedOccasion, setSelectedOccasion] = useState<string>(
    list?.occasion || ''
  );
  const [dateError, setDateError] = useState<string | null>(null);

  const validateDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      setDateError('Please enter a valid date');
      return false;
    }
    if (date.getFullYear() < 1000) {
      setDateError('Please enter a year of 1900 or later');
      return false;
    }
    setDateError(null);
    return true;
  };

  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async (prevState: ActionResponse, formData: FormData) => {
    const dateString = formData.get('date') as string;

    if (!validateDate(dateString)) {
      return {
        success: false,
        message: 'Please correct the errors below',
        errors: { date: ['Invalid date'] },
      };
    }

    const rawSubtitle =
      (formData.get('subtitle') as string | null)?.trim() ?? '';
    const data = {
      name: formData.get('name') as string,
      subtitle: rawSubtitle === '' ? null : rawSubtitle,
      occasion: selectedOccasion,
      date: new Date(dateString),
    };

    try {
      const result = isEditing
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
          router.push(`/lists/${result.id}/choose-items?new=1`);
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

  return (
    <FormShell
      title={isEditing ? 'Edit List' : 'New List'}
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
          <TextField
            label="Name"
            required
            name="name"
            defaultValue={list?.name}
            disabled={isPending}
          />

          <TextField
            label="Subtitle"
            name="subtitle"
            defaultValue={list?.subtitle ?? ''}
            disabled={isPending}
            placeholder="e.g. Brandy Family"
            maxLength={120}
          />

          <DatalistField
            label="Occasion"
            name="occasion"
            value={selectedOccasion}
            onChange={(e) => setSelectedOccasion(e.target.value)}
            disabled={isPending}
            placeholder="Select or type an occasion"
            autoComplete="off"
            options={commonOccasions.map((o) => (
              <option key={o} value={o} />
            ))}
          />

          <DateField
            label="Date"
            required
            name="date"
            defaultValue={
              list?.date
                ? new Date(list.date).toISOString().split('T')[0]
                : undefined
            }
            disabled={isPending}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              validateDate(e.target.value)
            }
            min="1900-01-01"
            max="9999-12-31"
            error={
              dateError ??
              (state?.errors?.date ? state.errors.date.join(', ') : undefined)
            }
          />
        </div>

        <FormShellFooter
          cancelHref={onClose ? undefined : closeHref}
          onCancel={onClose}
          submitLabel={isEditing ? 'Update List' : 'Create List'}
          isPending={isPending}
          deleteSlot={
            isEditing && list ? <DeleteListButton id={list.id} /> : undefined
          }
        />
      </form>
    </FormShell>
  );
}
