'use client';

import type { SpoilerTier } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';

type RowAction = () => Promise<{ success: boolean; message: string }>;

export function useRowAction(): [boolean, (action: RowAction) => void] {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: RowAction) =>
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else toast.error(result.message);
    });

  return [isPending, run];
}

export type Save = (
  next: SpoilerTier
) => Promise<{ success: boolean; message: string }>;

// Optimistic, with the previous value held so a refusal puts the control back
// where it was rather than leaving it showing a state that was never written.
export function useBaselineEditor(initial: SpoilerTier, save: Save) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const commit = (next: SpoilerTier) => {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await save(next);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        setValue(previous);
        toast.error(result.message);
      }
    });
  };

  return { value, isPending, commit };
}
