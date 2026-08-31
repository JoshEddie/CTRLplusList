'use client';

import { MenuItemRadio } from '@/app/ui/components/menu';
import { ROLES, isGrantable } from '@/lib/data/profile.roles';
import type { RoleShape } from '@/lib/types';

// Radios rather than plain items: whatever carries this menu already holds one
// of the roles it offers.
export function RoleChoices({
  current,
  disabled,
  onPick,
}: {
  current: RoleShape;
  /** `aria-disabled` is advisory on a menu row, so the pick is guarded too. */
  disabled?: boolean;
  onPick: (role: RoleShape) => void;
}) {
  return Object.values(ROLES)
    .filter(isGrantable)
    .map((role) => (
      <MenuItemRadio
        key={role.value}
        checked={current.value === role.value}
        aria-disabled={disabled || undefined}
        onSelect={() => {
          if (disabled) return;
          onPick(role);
        }}
      >
        {role.label}
      </MenuItemRadio>
    ));
}
