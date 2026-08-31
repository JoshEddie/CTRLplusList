'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
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
