import { lists, user_blocks, user_follows, users } from '../../db/schema';
import type { bootPglite } from './db';

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

type SeedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  last_seen_following_at?: Date | null;
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
}

export async function seedFollow(
  db: TestDb,
  follower_id: string,
  followee_id: string,
  created_at?: Date
): Promise<void> {
  await db.insert(user_follows).values({
    follower_id,
    followee_id,
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
    blocker_id,
    blocked_id,
    ...(created_at ? { created_at } : {}),
  });
}

type SeedList = {
  id: string;
  user_id: string;
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
    user_id: list.user_id,
    visibility: list.visibility ?? 'public',
    shared_at: list.shared_at ?? new Date(),
  });
}
