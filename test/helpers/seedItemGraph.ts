import {
  item_stores,
  items,
  list_items,
  lists,
  purchases,
} from '../../db/schema';
import type { bootPglite } from './db';

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

type SeedList = {
  id: string;
  user_id: string;
  visibility?: string;
  created_at?: Date;
  updated_at?: Date;
  shared_at?: Date | null;
};

export async function seedList(db: TestDb, list: SeedList): Promise<void> {
  await db.insert(lists).values({
    id: list.id,
    name: list.id,
    occasion: 'birthday',
    user_id: list.user_id,
    visibility: list.visibility ?? 'private',
    ...(list.created_at ? { created_at: list.created_at } : {}),
    ...(list.updated_at ? { updated_at: list.updated_at } : {}),
    ...(list.shared_at !== undefined ? { shared_at: list.shared_at } : {}),
  });
}

type SeedItem = {
  id: string;
  user_id: string;
  created_at?: Date;
  archived_at?: Date | null;
  quantity_limit?: number | null;
};

export async function seedItem(db: TestDb, item: SeedItem): Promise<void> {
  await db.insert(items).values({
    id: item.id,
    name: item.id,
    user_id: item.user_id,
    ...(item.created_at ? { created_at: item.created_at } : {}),
    ...(item.archived_at !== undefined ? { archived_at: item.archived_at } : {}),
    ...(item.quantity_limit !== undefined
      ? { quantity_limit: item.quantity_limit }
      : {}),
  });
}

export async function seedListItem(
  db: TestDb,
  list_id: string,
  item_id: string,
  position: number
): Promise<void> {
  await db.insert(list_items).values({ list_id, item_id, position });
}

type SeedStore = {
  id: string;
  item_id: string;
  name?: string;
  order?: number;
};

export async function seedStore(db: TestDb, store: SeedStore): Promise<void> {
  await db.insert(item_stores).values({
    id: store.id,
    item_id: store.item_id,
    name: store.name ?? store.id,
    link: 'https://example.com',
    price: '10',
    order: store.order ?? 1,
  });
}

type SeedPurchase = {
  id: string;
  item_id: string;
  user_id?: string | null;
  guest_name?: string | null;
  purchased_at?: Date;
};

export async function seedPurchase(
  db: TestDb,
  purchase: SeedPurchase
): Promise<void> {
  await db.insert(purchases).values({
    id: purchase.id,
    item_id: purchase.item_id,
    user_id: purchase.user_id ?? null,
    guest_name: purchase.guest_name ?? null,
    ...(purchase.purchased_at ? { purchased_at: purchase.purchased_at } : {}),
  });
}
