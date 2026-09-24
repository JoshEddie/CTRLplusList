'use client';

import { MenuItemRadio } from '@/app/ui/components/menu';
import { setListVisibility } from '@/lib/data/list.actions';
import { type ListVisibility } from '@/lib/visibility';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { VISIBILITY_ROWS, type VisibilityRow } from './visibility-rows';

// Renders the same three rows VisibilityPicker shows (Hidden / Private /
// Shared) directly inside the kebab menu, instead of opening a nested
// popover. The row table is shared via ./visibility-rows so labels,
// icons, and toast copy stay in lockstep with the popover.
export default function VisibilityMenuItems({
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

  // Takes the row, not its value: the row already carries the toast copy, so
  // looking it back up would only reintroduce a miss the caller cannot reach.
  const apply = (row: VisibilityRow) => {
    const next = row.value;
    if (next === current || isPending || disabled) return;
    const prev = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setListVisibility(listId, next);
      if (!result.success) {
        setCurrent(prev);
        toast.error(result.message);
        return;
      }
      toast.success(row.toast);
      router.refresh();
    });
  };

  return (
    <>
      {VISIBILITY_ROWS.map((row) => (
        <MenuItemRadio
          key={row.value}
          icon={row.icon}
          description={row.description}
          checked={row.value === current}
          aria-disabled={isPending || disabled || undefined}
          onSelect={() => apply(row)}
        >
          {row.label}
        </MenuItemRadio>
      ))}
    </>
  );
}
