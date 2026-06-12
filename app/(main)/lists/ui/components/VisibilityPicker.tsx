'use client';

import { setListVisibility } from '@/lib/data/list.actions';
import { Menu, MenuItemRadio } from '@/app/ui/components/menu';
import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import { type ListVisibility } from '@/lib/visibility';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import { VISIBILITY_ROWS, rowFor } from './visibility-rows';

export default function VisibilityPicker({
  listId,
  initialVisibility,
}: {
  listId: string;
  initialVisibility: ListVisibility;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<ListVisibility>(initialVisibility);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const apply = (next: ListVisibility) => {
    if (next === current || isPending) return;
    const prev = current;
    setCurrent(next);
    setOpen(false);
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

  const currentRow = rowFor(current);

  return (
    <div className="visibility-picker">
      <PopoverTrigger
        ref={triggerRef}
        tone="on-dark"
        icon={currentRow.icon}
        label={currentRow.label}
        active={open}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Visibility: ${currentRow.label} — ${currentRow.description}. Click to change.`}
      />
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        aria-label="List visibility"
        className="visibility-menu"
      >
        {VISIBILITY_ROWS.map((row) => (
          <MenuItemRadio
            key={row.value}
            icon={row.icon}
            description={row.description}
            checked={row.value === current}
            disabled={isPending}
            onSelect={() => apply(row.value)}
          >
            {row.label}
          </MenuItemRadio>
        ))}
      </Menu>
    </div>
  );
}
