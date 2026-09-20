import {
  ACCENT_PREFERENCE_ID,
  SPOILER_PREFERENCE_ROWS,
  SPOILER_TIER_PREFERENCE_ID,
  lists,
  preferences,
  profile_avatars,
  profile_members,
  profile_preferences,
  profiles,
  user_blocks,
  user_follows,
  users,
} from '../../db/schema';
import { ROLES } from '@/lib/data/profile.roles';
import type { SpoilerTier } from '@/lib/types';
import type { bootPglite } from './db';
import { selfProfileOf } from './profile';

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

export { selfProfileOf };

type SeedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  last_seen_following_at?: Date | null;
  profile_name?: string;
};

export async function seedUsers(db: TestDb, ids: SeedUser[]): Promise<void> {
  await db.insert(users).values(
    ids.map((u) => ({
      id: u.id,
      name: u.name ?? u.id,
      email: u.email ?? `${u.id}@test.local`,
      image: u.image ?? null,
      last_seen_following_at: u.last_seen_following_at ?? null,
    }))
  );
  await db.insert(profiles).values(
    ids.map((u) => ({
      id: selfProfileOf(u.id),
      name: u.profile_name ?? u.name ?? u.id,
    }))
  );
  // The `self` membership is the only thing that resolves a profile back to an
  // account, so every read that joins through it needs one seeded here rather
  // than per test.
  await db.insert(profile_members).values(
    ids.map((u) => ({
      user_id: u.id,
      profile_id: selfProfileOf(u.id),
      role: ROLES.self.value,
    }))
  );
}

export async function seedManagedProfile(
  db: TestDb,
  profile: { id: string; name?: string }
): Promise<void> {
  await db.insert(profiles).values({
    id: profile.id,
    name: profile.name ?? profile.id,
  });
}

// A membership beyond the `self` rows `seedUsers` writes. `last_active_at`
// defaults to NULL — the never-acted-as value a fresh membership carries.
export async function seedMembership(
  db: TestDb,
  membership: {
    user_id: string;
    profile_id: string;
    role?: string;
    last_active_at?: Date | null;
    baseline?: SpoilerTier;
  }
): Promise<void> {
  await db.insert(profile_members).values({
    user_id: membership.user_id,
    profile_id: membership.profile_id,
    role: membership.role ?? ROLES.owner.value,
    last_active_at: membership.last_active_at ?? null,
  });
  // The tier is an account-keyed preference row, not a membership column. An
  // absent row resolves to `surprise`, so only a supplied baseline writes one.
  if (membership.baseline) {
    await seedSpoilerCatalog(db);
    await db.insert(profile_preferences).values({
      profile_id: membership.profile_id,
      user_id: membership.user_id,
      preference_id: SPOILER_TIER_PREFERENCE_ID,
      value: membership.baseline,
    });
  }
}

export async function seedFollow(
  db: TestDb,
  follower_id: string,
  followee_id: string,
  created_at?: Date
): Promise<void> {
  await db.insert(user_follows).values({
    follower_id,
    followee_profile_id: selfProfileOf(followee_id),
    ...(created_at ? { created_at } : {}),
  });
}

export async function seedBlock(
  db: TestDb,
  blocker_id: string,
  blocked_id: string,
  created_at?: Date
): Promise<void> {
  await db.insert(user_blocks).values({
    blocker_profile_id: selfProfileOf(blocker_id),
    blocked_profile_id: selfProfileOf(blocked_id),
    ...(created_at ? { created_at } : {}),
  });
}

type SeedList = {
  id: string;
  user_id?: string;
  profile_id?: string;
  visibility?: string;
  shared_at?: Date | null;
};

export async function seedPublicList(
  db: TestDb,
  list: SeedList
): Promise<void> {
  await db.insert(lists).values({
    id: list.id,
    name: list.id,
    occasion: 'birthday',
    profile_id: list.profile_id ?? selfProfileOf(list.user_id ?? list.id),
    visibility: list.visibility ?? 'public',
    shared_at: list.shared_at ?? new Date(),
  });
}

// `resetDb` truncates every schema table, including the catalog migration 0013
// seeds — so a suite that writes an accent must put the row back per test or
// every accent write fails its foreign key.
export async function seedAccentCatalog(db: TestDb): Promise<void> {
  await db
    .insert(preferences)
    .values({
      id: ACCENT_PREFERENCE_ID,
      name: 'Accent color',
      type: 'text',
    })
    .onConflictDoNothing();
}

export async function seedAccentValue(
  db: TestDb,
  profile_id: string,
  accent: string
): Promise<void> {
  await db.insert(profile_preferences).values({
    profile_id,
    preference_id: ACCENT_PREFERENCE_ID,
    value: accent,
  });
}

// The catalog rows and the per-profile values behind the profile-level spoiler
// default. Seeded together because a value row references its catalog row.
export async function seedSpoilerCatalog(db: TestDb): Promise<void> {
  await db
    .insert(preferences)
    .values(SPOILER_PREFERENCE_ROWS.map((row) => ({ ...row })))
    .onConflictDoNothing();
}

export async function seedSpoilerDefault(
  db: TestDb,
  profile_id: string,
  tier: SpoilerTier
): Promise<void> {
  await seedSpoilerCatalog(db);
  // The profile-wide default is the null-account row.
  await db.insert(profile_preferences).values({
    profile_id,
    user_id: null,
    preference_id: SPOILER_TIER_PREFERENCE_ID,
    value: tier,
  });
}

// The one row every avatar read joins. `options` is opaque to the reads —
// only `style` and `art` are ever selected — so fixtures carry the minimum the
// column's type admits.
export async function seedAvatar(
  db: TestDb,
  profile_id: string,
  avatar: { style?: string; art?: string } = {}
): Promise<void> {
  await db.insert(profile_avatars).values({
    profile_id,
    style: avatar.style ?? 'toon-head',
    options: { seed: profile_id, selections: {} },
    art: avatar.art ?? '<svg />',
  });
}
