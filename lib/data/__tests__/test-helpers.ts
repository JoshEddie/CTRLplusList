import {
  item_images,
  item_stores,
  items,
  list_items,
  list_visits,
  lists,
  profile_members,
  profiles,
  purchases,
} from '@/db/schema';
import type { bootPglite } from '@/test/helpers/db';
import { selfProfileOf } from '@/test/helpers/profile';

// Shared seed helpers for the lib/data test lanes.
// The vi.mock harness (the `@/db` getter-holder, the `@/lib/auth` mock,
// mockNextCache) stays inline per file because vi.mock is hoisted per module;
// only the pure `db.insert` graph builders are shared here. Excluded from
// coverage by the `**/__tests__/**` glob in vitest.config.ts.

export type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

export { selfProfileOf };

// The one string that pairs the claim writers with the claimed-count read:
// createPurchase / removePurchase fire it, and getListClaimedCount has to
// carry it or no claim ever moves the count. Spelled out rather than taken
// from `cacheTags` so a change to the builder fails both sides here instead of
// passing silently on both.
export const claimedItemPoolTag = (profileId: string) =>
  `items:profile:${profileId}`;

// Owned rows FK the owning profile, so seedList/seedItem upsert it first. The
// profile carries no account reference; a test that needs the account side
// seeds it through seedUsers, which writes the `self` membership.
async function ensureProfile(db: TestDb, profileId: string): Promise<void> {
  await db
    .insert(profiles)
    .values({ id: profileId, name: profileId })
    .onConflictDoNothing();
}

export async function seedList(
  db: TestDb,
  list: {
    id: string;
    user_id?: string;
    profile_id?: string;
    name?: string;
    subtitle?: string | null;
    occasion?: string;
    date?: Date;
    visibility?: string;
    shared?: boolean;
    shared_at?: Date | null;
    created_at?: Date;
    updated_at?: Date;
  }
): Promise<void> {
  const profileId = list.profile_id ?? selfProfileOf(list.user_id ?? list.id);
  await ensureProfile(db, profileId);
  await db.insert(lists).values({
    id: list.id,
    name: list.name ?? list.id,
    subtitle: list.subtitle ?? null,
    occasion: list.occasion ?? 'birthday',
    date: list.date ?? new Date('2030-01-01'),
    profile_id: profileId,
    visibility: list.visibility ?? 'private',
    shared: list.shared ?? false,
    shared_at: list.shared_at ?? null,
    ...(list.created_at ? { created_at: list.created_at } : {}),
    ...(list.updated_at ? { updated_at: list.updated_at } : {}),
  });
}

export async function seedItem(
  db: TestDb,
  item: {
    id: string;
    user_id?: string;
    profile_id?: string;
    name?: string;
    description?: string;
    image_url?: string | null;
    quantity_limit?: number | null;
    archived_at?: Date | null;
    created_at?: Date;
  }
): Promise<void> {
  const profileId = item.profile_id ?? selfProfileOf(item.user_id ?? item.id);
  await ensureProfile(db, profileId);
  await db.insert(items).values({
    id: item.id,
    name: item.name ?? item.id,
    description: item.description ?? '',
    image_url: item.image_url ?? null,
    profile_id: profileId,
    // Matches the schema default — explicit so the seeded state is readable.
    quantity_limit: item.quantity_limit === undefined ? 1 : item.quantity_limit,
    archived_at: item.archived_at ?? null,
    ...(item.created_at ? { created_at: item.created_at } : {}),
  });
}

export async function seedListItem(
  db: TestDb,
  row: {
    list_id: string;
    item_id: string;
    position: number;
    quantity?: number;
  }
): Promise<void> {
  await db.insert(list_items).values(row);
}

export async function seedPurchase(
  db: TestDb,
  purchase: {
    id: string;
    item_id: string;
    list_id?: string | null;
    units?: number;
    profile_id?: string | null;
    claimed_by_profile_id?: string | null;
    guest_name?: string | null;
    purchased_at?: Date;
  }
): Promise<void> {
  await db.insert(purchases).values({
    id: purchase.id,
    item_id: purchase.item_id,
    list_id: purchase.list_id ?? null,
    units: purchase.units ?? 1,
    profile_id: purchase.profile_id ?? null,
    claimed_by_profile_id: purchase.claimed_by_profile_id ?? null,
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

export async function seedItemImages(
  db: TestDb,
  itemId: string,
  urls: string[],
  activeUrl: string = urls[0]
): Promise<void> {
  await db.insert(item_images).values(
    urls.map((url) => ({
      item_id: itemId,
      url,
      active: url === activeUrl,
    }))
  );
}

export async function seedItemStore(
  db: TestDb,
  store: {
    id: string;
    item_id: string;
    name?: string;
    link?: string;
    price?: string;
    order?: number;
  }
): Promise<void> {
  await db.insert(item_stores).values({
    id: store.id,
    item_id: store.item_id,
    name: store.name ?? store.id,
    link: store.link ?? 'https://example.com',
    price: store.price ?? '10',
    order: store.order ?? 1,
  });
}

// The tags a mutation fired for the content it wrote, with the acted-as
// recency tag filtered out. The shared write gate fires
// `profile_members:user:<id>` on the first write of each hour so the switcher's
// ordering read refreshes; it is not the subject of any content module's
// suite, and the gate's own suite pins it. Filtering only that prefix leaves
// every content tag asserted exactly.
export function contentTagCalls(updateTag: {
  mock: { calls: unknown[][] };
}): unknown[][] {
  return updateTag.mock.calls.filter(
    ([tag]) => !String(tag).startsWith('profile_members:')
  );
}

// The UPDATEs a mutation issued against its own content, with the gate's
// acted-as stamp filtered out. The shared write gate updates `profile_members`
// on the first write of each hour; that write is pinned by the gate's own
// suite, and filtering it here leaves an "issued no write" assertion meaning
// exactly that about the content table.
export function contentUpdateCalls(spy: {
  mock: { calls: unknown[][] };
}): unknown[][] {
  return spy.mock.calls.filter(([table]) => table !== profile_members);
}
