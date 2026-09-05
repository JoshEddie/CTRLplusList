'use client';

import { Button } from '@/app/ui/components/button';
import { Menu } from '@/app/ui/components/menu';
import type { RoleShape } from '@/lib/types';
import { useRef, useState } from 'react';
import { RoleChoices } from './RoleChoices';

type RowAction = () => Promise<{ success: boolean; message: string }>;

export default function RoleMenuControl({
  current,
  disabled,
  ariaLabel,
  onChangeRole,
  run,
}: {
  current: RoleShape;
  disabled?: boolean;
  ariaLabel: string;
  onChangeRole: (role: RoleShape) => RowAction;
  run: (action: RowAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="member-row-role-control">
      <Button
        ref={triggerRef}
        variant="secondary"
        size="sm"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Change role
      </Button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        aria-label={ariaLabel}
      >
        <RoleChoices
          current={current}
          disabled={disabled}
          onPick={(role) => {
            setOpen(false);
            run(onChangeRole(role));
          }}
        />
      </Menu>
    </div>
  );
}
