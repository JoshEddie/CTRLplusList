'use client';

import { ActionResponse, createList, updateList } from '@/app/actions/lists';
import CancelSubmitButtons from '@/app/ui/components/Form/CancelSubmitButtons';
import {
  Form,
  FormError,
  FormGroup,
  FormInput,
  FormLabel,
} from '@/app/ui/components/Form/Form';
import FormSelect from '@/app/ui/components/Form/FormSelect';
import SelectWrapper from '@/app/ui/components/SelectWrapper';
import '@/app/ui/styles/select.css';
import { ListTable, OptionType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';

interface ListFormProps {
  list?: ListTable;
  user_id: string;
  isEditing?: boolean;
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
}: ListFormProps) {
  const router = useRouter();
  const [selectedOccasion, setSelectedOccasion] = useState<string>(
    list?.occasion || ''
  );

  // Use useActionState hook for the form submission action
  const [state, formAction, isPending] = useActionState<
    ActionResponse,
    FormData
  >(async (prevState: ActionResponse, formData: FormData) => {
    // Extract data from form
    const data = {
      name: formData.get('name') as string,
      occasion: selectedOccasion,
      date: new Date(formData.get('date') as string),
      user_id,
    };

    try {
      // Call the appropriate action based on whether we're editing or creating
      const result = isEditing
        ? await updateList(Number(list!.id), data)
        : await createList(data);

      // Handle successful submission
      if (result.success) {
        router.push(`/lists/${result.id}`);
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

  return (
    <>
      <Form action={formAction}>
        {state?.message && (
          <FormError
            className={`mb-4 ${
              state.success
                ? 'bg-green-100 text-green-800 border-green-300'
                : ''
            }`}
          >
            {state.message}
          </FormError>
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
          />
        </FormGroup>
        <CancelSubmitButtons
          isPending={isPending}
          isEditing={isEditing}
          type="List"
        />
      </Form>
    </>
  );
}
