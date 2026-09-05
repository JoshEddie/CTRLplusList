import type { RoleShape } from '@/lib/types';

export function RoleTag({ role }: { role: RoleShape }) {
  return (
    <span className={`member-role-tag member-role-tag--${role.value}`}>
      {role.label}
    </span>
  );
}
