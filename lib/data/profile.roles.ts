// The role vocabulary every profile-scoped write is measured against. Its own
// module rather than `profile.gate.ts`: the gate reaches NextAuth through
// `user.session`, and read modules that only need to answer "does this role
// clear the floor" must not drag an auth runtime into their module graph.
// Nothing here imports anything.

// The roles that make a profile selectable, and so writable-as once selected.
// Named rather than inferred from the row's existence: the column's CHECK
// admits exactly these today, and a role added later must not walk through
// the gate by default.
export const WRITE_ROLES = ['self', 'owner', 'manager'] as const;

// The two role floors a profile-scoped write may name. Spelled out rather than
// derived from `WRITE_ROLES`: that set answers "may this account act as the
// profile at all", and a role added there later must not clear a floor by
// default any more than it walks through the gate by default.
export type RoleFloor = 'member' | 'owner';

const FLOOR_ROLES: Record<RoleFloor, readonly string[]> = {
  member: ['self', 'owner', 'manager'],
  owner: ['self', 'owner'],
};

// Nullable because a caller that reached the row without a membership — the
// unclaim path's item-owner leg — asks the same question and must get `false`
// rather than branch around the floor.
export function meetsFloor(role: string | null, floor: RoleFloor): boolean {
  return role !== null && FLOOR_ROLES[floor].includes(role);
}
