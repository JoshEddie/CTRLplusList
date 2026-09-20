'use client';

import { setListVisibility } from '@/lib/data/list.actions';
import {
  SegmentedControl,
  SegmentedOption,
} from '@/app/ui/components/segmented-control';
import { type ListVisibility } from '@/lib/visibility';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { VISIBILITY_ROWS, rowFor } from './visibility-rows';

export default function VisibilityPicker({
  listId,
  initialVisibility,
  disabled,
}: {
  listId: string;
  initialVisibility: ListVisibility;
  disabled: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<ListVisibility>(initialVisibility);
  const [isPending, startTransition] = useTransition();

  const apply = (next: ListVisibility) => {
    if (next === current || isPending) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setListVisibility(listId, next);
      if (!result.success) {
        setCurrent(prev);
        toast.error(result.message);
        return;
      }
      toast.success(rowFor(next).toast);
      router.refresh();
    });
  };

  return (
    <SegmentedControl
      value={current}
      onChange={apply}
      tone="on-dark"
      size="xs"
      className="visibility-picker"
      aria-label="Visibility"
    >
      {VISIBILITY_ROWS.map((row) => (
        <SegmentedOption
          key={row.value}
          value={row.value}
          title={row.description}
          disabled={disabled || isPending}
        >
          {row.icon} {row.label}
        </SegmentedOption>
      ))}
    </SegmentedControl>
  );
}
