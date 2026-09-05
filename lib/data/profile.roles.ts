// The role vocabulary every profile-scoped write is measured against. Its own
// module rather than `profile.gate.ts`, which reaches NextAuth: a module asking
// only what a role may do must not drag an auth runtime into its module graph.
// Nothing here imports anything that survives compilation.
import type { RoleShape } from '@/lib/types';

const SELF: RoleShape = {
  value: 'self',
  label: 'You',
  isSelf: true,
  admin: true,
};

const OWNER: RoleShape = {
  value: 'owner',
  label: 'Owner',
  isSelf: false,
  admin: true,
};

const MANAGER: RoleShape = {
  value: 'manager',
  label: 'Manager',
  isSelf: false,
  admin: false,
};

// The only way to reach a role: nothing outside this module holds one of the
// records directly, so the vocabulary cannot grow a second home.
export const ROLES = { self: SELF, owner: OWNER, manager: MANAGER };

// The one place a stored value becomes a role. Every value the column holds is
// one of these — the CHECK constraint is what says so — so a miss can only
// follow a schema change, and it lands on the narrowest rights rather than
// failing the read that found it.
export function roleOf(stored: string): RoleShape {
  return Object.values(ROLES).find((role) => role.value === stored) ?? MANAGER;
}

// A link admits a member, and the identity relation is not a membership anyone
// can hand out: onboarding alone mints that one.
export const isGrantable = (role: RoleShape) => !role.isSelf;

// Strict where `roleOf` is lenient, because this value arrives from a client
// rather than from the column, so nothing vouches for it.
export function grantableRole(stored: string): RoleShape | undefined {
  return Object.values(ROLES).find(
    (role) => role.value === stored && isGrantable(role)
  );
}
