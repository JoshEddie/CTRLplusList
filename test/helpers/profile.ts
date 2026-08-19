import type { ProfileTable } from '@/lib/types';

// A deterministic profile id for fixtures and the dev seed, so a test can name
// a seeded user's profile without a lookup. Production mints an opaque nanoid
// and reaches the account through `profile_members`; nothing here is that
// scheme, and no migration reproduces it.
export const selfProfileOf = (userId: string) => `self-${userId}`;

// A `profiles` row for suites that mock a read rather than seed one. Ids and
// name are what assertions discriminate on, so the timestamps are fixed.
export function makeProfile(id: string, name = id): ProfileTable {
  return {
    id,
    name,
    created_at: new Date(0),
    updated_at: new Date(0),
  };
}
