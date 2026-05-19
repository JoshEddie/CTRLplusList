/**
 * Idempotent dev-only seed. Creates the bypass test viewer plus a small social
 * graph (mutual + one-way follows, public lists with items, visit history, and
 * bookmarks) so the home-page rails have content when AUTH_BYPASS=true.
 *
 * Run with: `npm run db:seed:dev`. Safe to re-run — all inserts use
 * deterministic IDs and `.onConflictDoNothing()`. Hard-fails on production.
 */
import 'dotenv/config';
import { inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  item_stores,
  items,
  list_items,
  list_visits,
  user_follows,
  users,
} from '../db/schema';

if (process.env.NODE_ENV === 'production') {
  console.error('[seed-dev-users] Refusing to run with NODE_ENV=production');
  process.exit(1);
}

const VIEWER_ID = 'dev-test-viewer';

// Inline SVG data URL so dev avatars render through next/image without needing
// an extra remotePatterns entry (and so UserImage doesn't get an empty src,
// which it doesn't null-check — see app/(auth)/ui/components/UserAvatarPopover).
function avatar(initials: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="40" fill="${bg}"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,sans-serif" font-size="32" font-weight="600" fill="white">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type SeedUser = { id: string; name: string; email: string; image: string };
const seedUsers: SeedUser[] = [
  { id: VIEWER_ID, name: 'Test Viewer', email: 'test-viewer@dev.local', image: avatar('TV', '#5b21b6') },
  { id: 'dev-friend-alice', name: 'Alice Example', email: 'alice@dev.local', image: avatar('AE', '#0ea5e9') },
  { id: 'dev-friend-bob', name: 'Bob Example', email: 'bob@dev.local', image: avatar('BE', '#16a34a') },
  { id: 'dev-friend-carol', name: 'Carol Example', email: 'carol@dev.local', image: avatar('CE', '#ea580c') },
  { id: 'dev-friend-dave', name: 'Dave Example', email: 'dave@dev.local', image: avatar('DE', '#dc2626') },
];

type SeedList = {
  id: string;
  name: string;
  occasion: string;
  user_id: string;
  visibility: 'private' | 'unlisted' | 'public';
  itemNames: string[];
};
const seedLists: SeedList[] = [
  {
    id: 'dev-list-viewer-birthday',
    name: "Test Viewer's Birthday",
    occasion: 'Birthday',
    user_id: VIEWER_ID,
    visibility: 'public',
    itemNames: ['Cast-iron skillet', 'Bluetooth speaker', 'Pour-over kettle'],
  },
  {
    id: 'dev-list-viewer-housewarming',
    name: 'Housewarming Wishes',
    occasion: 'Housewarming',
    user_id: VIEWER_ID,
    visibility: 'private',
    itemNames: ['Linen napkins', 'Ceramic planter', 'Wool throw blanket'],
  },
  {
    id: 'dev-list-alice-wedding',
    name: "Alice's Wedding Registry",
    occasion: 'Wedding',
    user_id: 'dev-friend-alice',
    visibility: 'public',
    itemNames: ['Stand mixer', 'Knife block', 'Espresso machine', 'Dutch oven'],
  },
  {
    id: 'dev-list-alice-baby',
    name: 'Baby On The Way',
    occasion: 'Baby Shower',
    user_id: 'dev-friend-alice',
    visibility: 'public',
    itemNames: ['Stroller', 'Crib mobile', 'Baby monitor'],
  },
  {
    id: 'dev-list-bob-holiday',
    name: "Bob's Holiday List",
    occasion: 'Holiday',
    user_id: 'dev-friend-bob',
    visibility: 'public',
    itemNames: ['Ski goggles', 'Wool socks', 'Hardcover novel'],
  },
  {
    id: 'dev-list-carol-graduation',
    name: "Carol's Graduation",
    occasion: 'Graduation',
    user_id: 'dev-friend-carol',
    visibility: 'public',
    itemNames: ['Mechanical keyboard', 'Standing desk mat', 'Noise-cancelling headphones'],
  },
  {
    id: 'dev-list-dave-birthday',
    name: "Dave's Big 4-0",
    occasion: 'Birthday',
    user_id: 'dev-friend-dave',
    visibility: 'public',
    itemNames: ['Whiskey decanter', 'Cigar humidor', 'Leather wallet'],
  },
];

type SeedVisit = {
  user_id: string;
  list_id: string;
  daysAgo: number;
  bookmarked: boolean;
};
const seedVisits: SeedVisit[] = [
  // Recency descending: alice/wedding most recent, dave oldest.
  { user_id: VIEWER_ID, list_id: 'dev-list-alice-wedding', daysAgo: 0, bookmarked: true },
  { user_id: VIEWER_ID, list_id: 'dev-list-alice-baby', daysAgo: 1, bookmarked: false },
  { user_id: VIEWER_ID, list_id: 'dev-list-bob-holiday', daysAgo: 3, bookmarked: false },
  { user_id: VIEWER_ID, list_id: 'dev-list-dave-birthday', daysAgo: 7, bookmarked: true },
];

const seedFollows: { follower_id: string; followee_id: string }[] = [
  { follower_id: VIEWER_ID, followee_id: 'dev-friend-alice' }, // mutual
  { follower_id: 'dev-friend-alice', followee_id: VIEWER_ID },
  { follower_id: VIEWER_ID, followee_id: 'dev-friend-bob' }, // one-way out
  { follower_id: 'dev-friend-carol', followee_id: VIEWER_ID }, // one-way in
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[seed-dev-users] DATABASE_URL is not set');
    process.exit(1);
  }
  console.log('[seed-dev-users] Seeding…');

  // --reset: wipe all data tied to seeded users before re-inserting. The
  // schema's onDelete cascades from users.id remove every owned list, item,
  // store, visit, follow, etc. — including UI-created rows under the test
  // viewer that lack a dev-* prefix.
  if (process.argv.includes('--reset')) {
    const seededIds = seedUsers.map((u) => u.id);
    const deleted = await db
      .delete(users)
      .where(inArray(users.id, seededIds))
      .returning({ id: users.id });
    console.log(
      `  reset: deleted ${deleted.length} seeded users (children cascaded)`
    );
  }

  // Update name + image on conflict so re-runs pick up avatar changes.
  await db
    .insert(users)
    .values(
      seedUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: new Date(),
        image: u.image,
      }))
    )
    .onConflictDoUpdate({
      target: users.id,
      set: { name: sql`excluded.name`, image: sql`excluded.image` },
    });
  console.log(`  users: ${seedUsers.length} upserted`);

  const now = Date.now();
  const sharedAt = new Date(now - 1000 * 60 * 60 * 24 * 14); // 2 weeks ago
  // Raw SQL — Drizzle 0.45 includes every schema-declared column in generated
  // INSERTs (including `subtitle`, which may not yet exist in the dev DB if
  // migration 0002 hasn't been applied). Explicit column list keeps the seed
  // resilient to schema-vs-DB drift on unrelated columns.
  for (const l of seedLists) {
    const shared = l.visibility !== 'private';
    const sa = shared ? sharedAt : null;
    await db.execute(sql`
      INSERT INTO lists (id, name, occasion, user_id, visibility, shared, shared_at)
      VALUES (${l.id}, ${l.name}, ${l.occasion}, ${l.user_id}, ${l.visibility}, ${shared}, ${sa})
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log(`  lists: ${seedLists.length} upserted`);

  // Items + list_items: deterministic IDs derived from list id + position so
  // re-runs are no-ops. Use picsum.photos seeded by item id for deterministic
  // realistic photos (ItemPhoto renders a plain <img>, so no remotePatterns
  // entry is needed). Images won't match the item name semantically — that's
  // fine for layout/design preview.
  const itemRows: {
    id: string;
    name: string;
    user_id: string;
    image_url: string;
  }[] = [];
  const listItemRows: { list_id: string; item_id: string; position: number }[] = [];
  for (const list of seedLists) {
    list.itemNames.forEach((name, idx) => {
      const itemId = `${list.id}-item-${idx + 1}`;
      itemRows.push({
        id: itemId,
        name,
        user_id: list.user_id,
        image_url: `https://picsum.photos/seed/${itemId}/400/400`,
      });
      listItemRows.push({ list_id: list.id, item_id: itemId, position: idx });
    });
  }
  // onConflictDoUpdate so re-runs apply new image_urls to previously-seeded rows.
  await db
    .insert(items)
    .values(itemRows)
    .onConflictDoUpdate({
      target: items.id,
      set: { image_url: sql`excluded.image_url` },
    });
  await db.insert(list_items).values(listItemRows).onConflictDoNothing();
  console.log(`  items: ${itemRows.length} upserted, list_items: ${listItemRows.length} upserted`);

  // Item stores — each item gets 1–3 stores with realistic-looking names,
  // prices (stored as text per schema), and links. Deterministic IDs and a
  // rotating store catalog keep re-runs idempotent and visually varied.
  // Prices are bare numeric strings — StoreLinks.tsx filters out stores where
  // Number(price) is NaN, and re-adds the `$` at render time.
  const STORE_CATALOG: { name: string; link: string; price: string }[] = [
    { name: 'Amazon', link: 'https://www.amazon.com/dp/B08EXAMPLE', price: '48.99' },
    { name: 'Target', link: 'https://www.target.com/p/-/A-12345678', price: '52.00' },
    { name: 'Williams Sonoma', link: 'https://www.williams-sonoma.com/products/example', price: '79.95' },
    { name: 'Crate & Barrel', link: 'https://www.crateandbarrel.com/example/s12345', price: '64.00' },
    { name: 'West Elm', link: 'https://www.westelm.com/products/example-h1234', price: '89.00' },
    { name: 'Etsy', link: 'https://www.etsy.com/listing/123456789/example', price: '35.50' },
  ];
  const storeRows: {
    id: string;
    item_id: string;
    name: string;
    link: string;
    price: string;
    order: number;
  }[] = [];
  for (const item of itemRows) {
    // 1–3 stores per item, deterministic by item id hash.
    const hash = item.id
      .split('')
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    const storeCount = (hash % 3) + 1;
    for (let i = 0; i < storeCount; i++) {
      const store = STORE_CATALOG[(hash + i) % STORE_CATALOG.length];
      storeRows.push({
        id: `${item.id}-store-${i + 1}`,
        item_id: item.id,
        name: store.name,
        link: store.link,
        price: store.price,
        order: i + 1,
      });
    }
  }
  await db
    .insert(item_stores)
    .values(storeRows)
    .onConflictDoUpdate({
      target: item_stores.id,
      set: {
        name: sql`excluded.name`,
        link: sql`excluded.link`,
        price: sql`excluded.price`,
      },
    });
  console.log(`  item_stores: ${storeRows.length} upserted`);

  await db
    .insert(user_follows)
    .values(seedFollows)
    .onConflictDoNothing();
  console.log(`  user_follows: ${seedFollows.length} upserted`);

  await db
    .insert(list_visits)
    .values(
      seedVisits.map((v) => ({
        user_id: v.user_id,
        list_id: v.list_id,
        last_visited_at: new Date(now - v.daysAgo * 24 * 60 * 60 * 1000),
        visit_count: 1,
        favorited_at: v.bookmarked
          ? new Date(now - v.daysAgo * 24 * 60 * 60 * 1000)
          : null,
      }))
    )
    .onConflictDoNothing();
  console.log(`  list_visits: ${seedVisits.length} upserted`);

  console.log('[seed-dev-users] Done.');
}

main().catch((err) => {
  console.error('[seed-dev-users] Failed:', err);
  process.exit(1);
});
