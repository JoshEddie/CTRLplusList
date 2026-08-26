import type { ActorProfile, UserIdentity } from '@/lib/types';

// A deterministic profile id for fixtures, so a test can name a seeded user's
// profile without a lookup. It is the contract between `seedUsers` and the
// files reading what it inserts.
export const selfProfileOf = (userId: string) => `self-${userId}`;

// A profile for suites that mock a read rather than seed one. Id and name are
// what assertions discriminate on, so the accent is left unset.
export function makeProfile(id: string, name = id): ActorProfile {
  return { id, name, accent: null };
}

// A resolved identity. One argument acts as themselves — the common case, and
// the only one that existed before the switcher; the second names the profile
// the request acts as.
export function makeIdentity(
  userId: string,
  self: ActorProfile,
  active: ActorProfile = self
): UserIdentity {
  return { userId, selfProfile: self, activeProfile: active };
}
