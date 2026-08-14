'use client';

import { createItem, updateItem } from '@/lib/data/item.actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { toItemDetails, type ItemViewModel } from './viewModel';

// Maps the view-model to the persisted shape and flows through the existing
// create/edit actions unchanged (D2). Navigation mirrors the retired
// useItemForm: onSuccess (modal) refreshes in place; otherwise push returnTo.
export function useItemSubmit(
  item: ItemViewModel,
  isEditing: boolean,
  returnTo?: string,
  onSuccess?: () => void
) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const submit = async () => {
    setIsPending(true);
    try {
      const payload = toItemDetails(item);
      const result = isEditing
        ? await updateItem(payload)
        : await createItem(payload);

      if (result.success) {
        toast.success(`Item ${isEditing ? 'updated' : 'created'} successfully`);
        if (onSuccess) {
          onSuccess();
          router.refresh();
        } else {
          router.push(returnTo ?? '/items');
          router.refresh();
        }
      } else {
        toast.error(result.message || 'An error occurred');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Item submission error:', error);
    } finally {
      setIsPending(false);
    }
  };

  return { submit, isPending };
}
