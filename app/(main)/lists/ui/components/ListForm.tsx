'use client';

import { ActionResponse, createList, updateList } from '@/app/actions/lists';
import {
  FormError,
  FormGroup,
  FormInput,
  FormLabel,
} from '@/app/ui/components/Form/Form';
import { FormShell, FormShellFooter } from '@/app/ui/components/FormShell';
import FormSelect from '@/app/ui/components/Form/FormSelect';
import SelectWrapper from '@/app/ui/components/SelectWrapper';
import '@/app/ui/styles/select.css';
import { ListTable, OptionType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useActionState, useState } from 'react';
import DeleteListButton from './DeleteListButton';

interface ListFormProps {
  list?: ListTable;
  user_id: string;
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
  user_id,
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

    const rawSubtitle = (formData.get('subtitle') as string | null)?.trim() ?? '';
    const data = {
      name: formData.get('name') as string,
      subtitle: rawSubtitle === '' ? null : rawSubtitle,
      occasion: selectedOccasion,
      date: new Date(dateString),
      user_id,
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
          // New list: redirect to choose-items regardless of modal/page mount —
          // this is the natural next step in the create flow.
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
              <FormError className="form-error">{state.message}</FormError>
            </div>
          )}
          <FormGroup>
            <FormLabel>Name</FormLabel>
            <FormInput
              name="name"
              defaultValue={list?.name}
              required
              disabled={isPending}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Subtitle</FormLabel>
            <FormInput
              name="subtitle"
              defaultValue={list?.subtitle ?? ''}
              disabled={isPending}
              placeholder="e.g. Brandy Family"
              maxLength={120}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Occasion</FormLabel>
            <SelectWrapper>
              <FormSelect
                name="occasion"
                defaultValue={
                  selectedOccasion
                    ? { value: selectedOccasion, label: selectedOccasion }
                    : undefined
                }
                options={commonOccasions.map((occasion) => ({
                  value: occasion,
                  label: occasion,
                }))}
                onChange={(e: OptionType | OptionType[] | null) => {
                  if (Array.isArray(e)) {
                    setSelectedOccasion(e[0].value);
                  } else {
                    setSelectedOccasion(e?.value || '');
                  }
                }}
                isPending={isPending}
                placeholder="Select an occasion"
              />
            </SelectWrapper>
          </FormGroup>

          <FormGroup>
            <FormLabel>Date</FormLabel>
            <FormInput
              name="date"
              type="date"
              defaultValue={
                list?.date
                  ? new Date(list.date).toISOString().split('T')[0]
                  : undefined
              }
              required
              disabled={isPending}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                validateDate(e.target.value)
              }
              min="1900-01-01"
              max="9999-12-31"
            />
            {dateError && <p className="error-message">{dateError}</p>}
            {state?.errors?.date && (
              <p className="error-message">{state.errors.date.join(', ')}</p>
            )}
          </FormGroup>
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
