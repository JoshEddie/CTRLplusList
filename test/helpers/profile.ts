import type { ProfileTable } from '@/lib/types';

export { selfProfileOf } from '@/lib/profileIds';

// A `profiles` row for suites that mock a read rather than seed one. Ids and
// name are what assertions discriminate on, so the timestamps are fixed.
export function makeProfile(
  id: string,
  name = id,
  user_id: string | null = null
): ProfileTable {
  return {
    id,
    name,
    user_id,
    created_at: new Date(0),
    updated_at: new Date(0),
  };
}
