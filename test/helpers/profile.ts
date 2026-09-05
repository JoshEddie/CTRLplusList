import { ROLES } from '@/lib/data/profile.roles';
import type {
  ActorProfile,
  ProfileMembershipView,
  UserIdentity,
} from '@/lib/types';

// A deterministic profile id for fixtures, so a test can name a seeded user's
// profile without a lookup. It is the contract between `seedUsers` and the
// files reading what it inserts.
export const selfProfileOf = (userId: string) => `self-${userId}`;

// A profile for suites that mock a read rather than seed one. Id and name are
// what assertions discriminate on, so the face is left unset. It carries the
// membership columns because that is what an identity's acting profile is —
// a suite indifferent to the role takes the `self` default.
export function makeProfile(
  id: string,
  name = id,
  role: ProfileMembershipView['role'] = ROLES.self
): ProfileMembershipView {
  return {
    id,
    name,
    accent: null,
    art: null,
    avatarStyle: null,
    tagline: null,
    role,
    last_active_at: null,
  };
}

// A resolved identity. One argument acts as themselves — the common case, and
// the only one that existed before the switcher; the second names the profile
// the request acts as.
export function makeIdentity(
  userId: string,
  self: ActorProfile,
  active: ProfileMembershipView = makeProfile(self.id, self.name)
): UserIdentity {
  return { userId, selfProfile: self, activeProfile: active };
}
