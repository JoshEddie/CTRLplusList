import {
  ACCENT_PREFERENCE_ID,
  lists,
  preferences,
  profile_members,
  profile_preferences,
  profiles,
  user_blocks,
  user_follows,
  users,
} from '../../db/schema';
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
      role: 'self',
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
