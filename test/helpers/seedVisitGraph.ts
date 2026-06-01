import { list_visits, lists } from '../../db/schema';
import type { bootPglite } from './db';

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

type SeedList = {
  id: string;
  user_id: string;
  name?: string;
  visibility?: string;
};

export async function seedList(db: TestDb, list: SeedList): Promise<void> {
  await db.insert(lists).values({
    id: list.id,
    name: list.name ?? list.id,
    occasion: 'birthday',
    user_id: list.user_id,
    visibility: list.visibility ?? 'public',
  });
}

type SeedVisit = {
  user_id: string;
  list_id: string;
  // `undefined` defaults to now; pass `null` explicitly to seed a removed-from-
  // history (last_visited_at IS NULL) or unbookmarked (favorited_at IS NULL) row.
  last_visited_at?: Date | null;
  visit_count?: number;
  favorited_at?: Date | null;
};

export async function seedVisit(db: TestDb, visit: SeedVisit): Promise<void> {
  await db.insert(list_visits).values({
    user_id: visit.user_id,
    list_id: visit.list_id,
    last_visited_at:
      visit.last_visited_at === undefined ? new Date() : visit.last_visited_at,
    visit_count: visit.visit_count ?? 1,
    favorited_at: visit.favorited_at ?? null,
  });
}
