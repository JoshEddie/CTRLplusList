import type { MemberRole } from '@/lib/data/profile.members.actions';

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
};

export function RoleTag({ role }: { role: string }) {
  return (
    <span className={`member-role-tag member-role-tag--${role}`}>
      {ROLE_LABELS[role as MemberRole] ?? role}
    </span>
  );
}
