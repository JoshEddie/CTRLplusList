import {
  item_stores,
  items,
  list_items,
  list_visits,
  lists,
  purchases,
} from '@/db/schema';
import type { bootPglite } from '@/test/helpers/db';

// Shared seed helpers for the action carve-out test files (items.test.ts,
// lists.test.ts). The vi.mock harness (the `@/db` getter-holder, the
// `@/lib/auth` mock, mockNextCache) stays inline per file because vi.mock is
// hoisted per module; only the pure `db.insert` graph builders are shared here.
// Excluded from coverage by the `**/__tests__/**` glob in vitest.config.ts.

export type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

export async function seedList(
  db: TestDb,
  list: {
    id: string;
    user_id: string;
    name?: string;
    subtitle?: string | null;
    occasion?: string;
    date?: Date;
    visibility?: string;
    shared?: boolean;
    shared_at?: Date | null;
  }
): Promise<void> {
  await db.insert(lists).values({
    id: list.id,
    name: list.name ?? list.id,
    subtitle: list.subtitle ?? null,
    occasion: list.occasion ?? 'birthday',
    date: list.date ?? new Date('2030-01-01'),
    user_id: list.user_id,
    visibility: list.visibility ?? 'private',
    shared: list.shared ?? false,
    shared_at: list.shared_at ?? null,
  });
}

export async function seedItem(
  db: TestDb,
  item: {
    id: string;
    user_id: string;
    name?: string;
    description?: string;
    image_url?: string | null;
    quantity_limit?: number | null;
    archived_at?: Date | null;
  }
): Promise<void> {
  await db.insert(items).values({
    id: item.id,
    name: item.name ?? item.id,
    description: item.description ?? '',
    image_url: item.image_url ?? null,
    user_id: item.user_id,
    quantity_limit:
      item.quantity_limit === undefined ? 1 : item.quantity_limit,
    archived_at: item.archived_at ?? null,
  });
}

export async function seedListItem(
  db: TestDb,
  row: { list_id: string; item_id: string; position: number }
): Promise<void> {
  await db.insert(list_items).values(row);
}

export async function seedPurchase(
  db: TestDb,
  purchase: {
    id: string;
    item_id: string;
    user_id?: string | null;
    guest_name?: string | null;
    purchased_at?: Date;
  }
): Promise<void> {
  await db.insert(purchases).values({
    id: purchase.id,
    item_id: purchase.item_id,
    user_id: purchase.user_id ?? null,
    guest_name: purchase.guest_name ?? null,
    purchased_at: purchase.purchased_at ?? new Date(),
  });
}

export async function seedListVisit(
  db: TestDb,
  visit: {
    user_id: string;
    list_id: string;
    last_visited_at?: Date | null;
    visit_count?: number;
    favorited_at?: Date | null;
  }
): Promise<void> {
  await db.insert(list_visits).values({
    user_id: visit.user_id,
    list_id: visit.list_id,
    last_visited_at:
      visit.last_visited_at === undefined ? new Date() : visit.last_visited_at,
    visit_count: visit.visit_count ?? 1,
    favorited_at: visit.favorited_at ?? null,
  });
}

export async function seedItemStore(
  db: TestDb,
  store: {
    id: string;
    item_id: string;
    name: string;
    link: string;
    price: string;
    order?: number;
  }
): Promise<void> {
  await db.insert(item_stores).values({
    id: store.id,
    item_id: store.item_id,
    name: store.name,
    link: store.link,
    price: store.price,
    order: store.order ?? 1,
  });
}
