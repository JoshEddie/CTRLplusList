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
  purchases,
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
// Expanded roster — enough friends to push the Following rail past horizontal
// scroll and to give Recently Visited / Bookmarks enough variety.
const FRIENDS: { slug: string; first: string; bg: string }[] = [
  { slug: 'alice', first: 'Alice', bg: '#0ea5e9' },
  { slug: 'bob', first: 'Bob', bg: '#16a34a' },
  { slug: 'carol', first: 'Carol', bg: '#ea580c' },
  { slug: 'dave', first: 'Dave', bg: '#dc2626' },
  { slug: 'eve', first: 'Eve', bg: '#7c3aed' },
  { slug: 'frank', first: 'Frank', bg: '#0891b2' },
  { slug: 'grace', first: 'Grace', bg: '#db2777' },
  { slug: 'hank', first: 'Hank', bg: '#65a30d' },
  { slug: 'iris', first: 'Iris', bg: '#f59e0b' },
  { slug: 'jack', first: 'Jack', bg: '#475569' },
];
const friendId = (slug: string) => `dev-friend-${slug}`;
const seedUsers: SeedUser[] = [
  {
    id: VIEWER_ID,
    name: 'Test Viewer',
    email: 'test-viewer@dev.local',
    image: avatar('TV', '#5b21b6'),
  },
  ...FRIENDS.map((f) => ({
    id: friendId(f.slug),
    name: `${f.first} Example`,
    email: `${f.slug}@dev.local`,
    image: avatar(`${f.first[0]}E`, f.bg),
  })),
];

type SeedList = {
  id: string;
  name: string;
  occasion: string;
  user_id: string;
  visibility: 'private' | 'unlisted' | 'public';
  itemNames: string[];
};

// Item-name pool — sized large enough that any single list pulling 15–20
// consecutive entries still looks plausible. Each list takes a deterministic
// slice (offset by hash of list ID), so reseeds produce the same items.
const ITEM_POOL = [
  'Cast-iron skillet', 'Bluetooth speaker', 'Pour-over kettle', 'Linen napkins',
  'Ceramic planter', 'Wool throw blanket', 'Stand mixer', 'Knife block',
  'Espresso machine', 'Dutch oven', 'Stroller', 'Crib mobile', 'Baby monitor',
  'Ski goggles', 'Wool socks', 'Hardcover novel', 'Mechanical keyboard',
  'Standing desk mat', 'Noise-cancelling headphones', 'Whiskey decanter',
  'Cigar humidor', 'Leather wallet', 'Aroma diffuser', 'Yoga mat', 'Travel mug',
  'Card game', 'Cookbook', 'Hand cream', 'Tote bag', 'Bath towels',
  'Decorative mirror', 'Wine opener', 'Cheese board', 'Picture frames',
  'Slippers', 'Reading lamp', 'French press', 'Notebook', 'Massage gun',
  'Air fryer', 'Cocktail shaker', 'Linen sheets', 'Cashmere scarf',
  'Walking shoes', 'Smart watch', 'Garden tools', 'Pizza stone', 'Tea kettle',
  'Vinyl record', 'Headphone stand',
];

// Deterministic hash for stable per-list offsets.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Build itemNames for a list: 15–20 items, sliced from ITEM_POOL at a stable
// offset. Wraps around the pool to support overlap between lists.
function itemsForList(listId: string): string[] {
  const h = hash(listId);
  const count = 15 + (h % 6); // 15..20
  const offset = h % ITEM_POOL.length;
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(ITEM_POOL[(offset + i) % ITEM_POOL.length]);
  return out;
}

// Viewer-owned lists — 15 of them across varied occasions to force both the
// MyListsRail horizontal scroll and the /lists page vertical scroll.
const VIEWER_LIST_TEMPLATES: {
  slug: string;
  name: string;
  occasion: string;
  visibility: 'private' | 'unlisted' | 'public';
}[] = [
  { slug: 'birthday', name: "Test Viewer's Birthday", occasion: 'Birthday', visibility: 'public' },
  { slug: 'housewarming', name: 'Housewarming Wishes', occasion: 'Housewarming', visibility: 'private' },
  { slug: 'holiday-2026', name: 'Holiday 2026', occasion: 'Holiday', visibility: 'public' },
  { slug: 'anniversary', name: 'Anniversary Picks', occasion: 'Anniversary', visibility: 'unlisted' },
  { slug: 'wedding-registry', name: 'Wedding Registry', occasion: 'Wedding', visibility: 'public' },
  { slug: 'kitchen-upgrade', name: 'Kitchen Upgrade', occasion: 'Just Because', visibility: 'private' },
  { slug: 'fitness-goals', name: 'Fitness Goals', occasion: 'Self-Care', visibility: 'public' },
  { slug: 'home-office', name: 'Home Office Refresh', occasion: 'Just Because', visibility: 'unlisted' },
  { slug: 'reading-stack', name: 'Reading Stack', occasion: 'Just Because', visibility: 'public' },
  { slug: 'camping-trip', name: 'Camping Trip Gear', occasion: 'Adventure', visibility: 'public' },
  { slug: 'baby-shower', name: 'Baby Shower Wishlist', occasion: 'Baby Shower', visibility: 'public' },
  { slug: 'graduation', name: 'Graduation Picks', occasion: 'Graduation', visibility: 'unlisted' },
  { slug: 'fathers-day', name: "Father's Day Ideas", occasion: 'Holiday', visibility: 'private' },
  { slug: 'mothers-day', name: "Mother's Day Ideas", occasion: 'Holiday', visibility: 'private' },
  { slug: 'spring-garden', name: 'Spring Garden', occasion: 'Hobby', visibility: 'public' },
];

// Friend-owned lists — 1–2 per friend, all public so the viewer can visit
// them. Mix of occasions for visual variety.
const FRIEND_LIST_TEMPLATES: {
  friendSlug: string;
  slug: string;
  name: string;
  occasion: string;
}[] = [
  { friendSlug: 'alice', slug: 'wedding', name: "Alice's Wedding Registry", occasion: 'Wedding' },
  { friendSlug: 'alice', slug: 'baby', name: 'Baby On The Way', occasion: 'Baby Shower' },
  { friendSlug: 'bob', slug: 'holiday', name: "Bob's Holiday List", occasion: 'Holiday' },
  { friendSlug: 'bob', slug: 'birthday', name: "Bob's Birthday", occasion: 'Birthday' },
  { friendSlug: 'carol', slug: 'graduation', name: "Carol's Graduation", occasion: 'Graduation' },
  { friendSlug: 'dave', slug: 'birthday', name: "Dave's Big 4-0", occasion: 'Birthday' },
  { friendSlug: 'eve', slug: 'housewarming', name: "Eve's New Place", occasion: 'Housewarming' },
  { friendSlug: 'eve', slug: 'wedding', name: "Eve's Wedding", occasion: 'Wedding' },
  { friendSlug: 'frank', slug: 'holiday', name: "Frank's Holiday Wishes", occasion: 'Holiday' },
  { friendSlug: 'grace', slug: 'birthday', name: "Grace's Birthday", occasion: 'Birthday' },
  { friendSlug: 'grace', slug: 'self-care', name: "Grace's Self-Care", occasion: 'Self-Care' },
  { friendSlug: 'hank', slug: 'anniversary', name: "Hank & Spouse's Anniversary", occasion: 'Anniversary' },
  { friendSlug: 'iris', slug: 'birthday', name: "Iris Turns 25", occasion: 'Birthday' },
  { friendSlug: 'jack', slug: 'graduation', name: "Jack's Graduation", occasion: 'Graduation' },
  { friendSlug: 'jack', slug: 'holiday', name: "Jack's Holiday", occasion: 'Holiday' },
];

const seedLists: SeedList[] = [
  ...VIEWER_LIST_TEMPLATES.map((t) => {
    const id = `dev-list-viewer-${t.slug}`;
    return {
      id,
      name: t.name,
      occasion: t.occasion,
      user_id: VIEWER_ID,
      visibility: t.visibility,
      itemNames: itemsForList(id),
    };
  }),
  ...FRIEND_LIST_TEMPLATES.map((t) => {
    const id = `dev-list-${t.friendSlug}-${t.slug}`;
    return {
      id,
      name: t.name,
      occasion: t.occasion,
      user_id: friendId(t.friendSlug),
      visibility: 'public' as const,
      itemNames: itemsForList(id),
    };
  }),
];

type SeedVisit = {
  user_id: string;
  list_id: string;
  daysAgo: number;
  bookmarked: boolean;
};
// Visit every public friend list — gives Recently Visited enough rows (≥15) to
// force pagination and horizontal scroll. Bookmark every other one so the
// Bookmarks rail has plenty of content too.
const seedVisits: SeedVisit[] = FRIEND_LIST_TEMPLATES.map((t, idx) => ({
  user_id: VIEWER_ID,
  list_id: `dev-list-${t.friendSlug}-${t.slug}`,
  daysAgo: idx, // 0, 1, 2, … so recency descending matches the template order
  bookmarked: idx % 2 === 0,
}));

// Follow graph — viewer follows ~6 friends; 4 follow back; 2 follow viewer
// one-way (so followers count exceeds following count visually).
const seedFollows: { follower_id: string; followee_id: string }[] = [
  // Viewer → friend (following count = 6)
  { follower_id: VIEWER_ID, followee_id: friendId('alice') },
  { follower_id: VIEWER_ID, followee_id: friendId('bob') },
  { follower_id: VIEWER_ID, followee_id: friendId('eve') },
  { follower_id: VIEWER_ID, followee_id: friendId('frank') },
  { follower_id: VIEWER_ID, followee_id: friendId('grace') },
  { follower_id: VIEWER_ID, followee_id: friendId('hank') },
  // Friend → viewer (followers count = 6; 4 mutual + 2 one-way)
  { follower_id: friendId('alice'), followee_id: VIEWER_ID },
  { follower_id: friendId('bob'), followee_id: VIEWER_ID },
  { follower_id: friendId('eve'), followee_id: VIEWER_ID },
  { follower_id: friendId('grace'), followee_id: VIEWER_ID },
  { follower_id: friendId('carol'), followee_id: VIEWER_ID },
  { follower_id: friendId('iris'), followee_id: VIEWER_ID },
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
  // Archive ~20% of viewer-owned items so the /items archived filter has
  // content. Fixed reference epoch keeps archived_at stable across reseeds.
  const ARCHIVE_EPOCH = new Date('2026-04-01T00:00:00Z').getTime();
  const itemRows: {
    id: string;
    name: string;
    user_id: string;
    image_url: string;
    archived_at: Date | null;
  }[] = [];
  const listItemRows: { list_id: string; item_id: string; position: number }[] = [];
  for (const list of seedLists) {
    list.itemNames.forEach((name, idx) => {
      const itemId = `${list.id}-item-${idx + 1}`;
      const h = hash(itemId);
      const archive = list.user_id === VIEWER_ID && h % 5 === 0; // ~20% of viewer items
      itemRows.push({
        id: itemId,
        name,
        user_id: list.user_id,
        image_url: `https://picsum.photos/seed/${itemId}/400/400`,
        archived_at: archive ? new Date(ARCHIVE_EPOCH - (h % 30) * 86400000) : null,
      });
      listItemRows.push({ list_id: list.id, item_id: itemId, position: idx });
    });
  }
  // onConflictDoUpdate so re-runs apply new image_url and archived_at to
  // previously-seeded rows (lets the seed restore archive state after UI drift).
  await db
    .insert(items)
    .values(itemRows)
    .onConflictDoUpdate({
      target: items.id,
      set: {
        image_url: sql`excluded.image_url`,
        archived_at: sql`excluded.archived_at`,
      },
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

  // Purchases on viewer-owned items: friends + occasional guests buy the
  // viewer's wishlist items. Higher rate on archived since "purchased" is the
  // most common reason something gets archived.
  //   active:   ~30% purchased    archived: ~70% purchased
  // Purchases on friend-owned items: viewer + other friends + occasional
  // guests claim things on friends' lists, so the rails (Recently visited,
  // Bookmarks, Following lists) show purchase status when spoilers are on.
  //   friend items: ~35% purchased
  // Buyer rotates deterministically; ~1 in 8 purchases is a guest checkout.
  const friendIds = FRIENDS.map((f) => friendId(f.slug));
  const GUEST_NAMES = ['Grandma', 'Uncle Mike', 'A friend', 'Neighbor Pat'];
  const PURCHASE_EPOCH = new Date('2026-05-01T00:00:00Z').getTime();
  const purchaseRows: {
    id: string;
    item_id: string;
    user_id: string | null;
    guest_name: string | null;
    purchased_at: Date;
  }[] = [];
  // Position-based selection per list (rather than global hash) so every list
  // — including small friend lists — gets a guaranteed share. For each list,
  // mark every Nth item as purchased.
  for (const list of seedLists) {
    const listItemIds = list.itemNames.map(
      (_, idx) => `${list.id}-item-${idx + 1}`
    );
    let purchaseRatio: number;
    if (list.user_id === VIEWER_ID) {
      purchaseRatio = 0.3; // viewer's active items
    } else {
      purchaseRatio = 0.4; // friend lists — viewer sees these via rails
    }
    listItemIds.forEach((itemId, idx) => {
      const item = itemRows.find((r) => r.id === itemId);
      if (!item) return;

      // Viewer's archived items get a higher rate (~70%) since archived often
      // means purchased.
      const isArchived = !!item.archived_at;
      const effectiveRatio =
        item.user_id === VIEWER_ID && isArchived ? 0.7 : purchaseRatio;
      // Stride-based: every floor(1/ratio)-th item gets purchased.
      const stride = Math.max(1, Math.round(1 / effectiveRatio));
      if (idx % stride !== 0) return;

      const h = hash(itemId);
      const asGuest = h % 8 === 0;
      let buyerId: string;
      if (item.user_id === VIEWER_ID) {
        buyerId = friendIds[h % friendIds.length];
      } else {
        const eligible = [VIEWER_ID, ...friendIds].filter(
          (id) => id !== item.user_id
        );
        buyerId = eligible[h % eligible.length];
      }
      purchaseRows.push({
        id: `${itemId}-purchase`,
        item_id: itemId,
        user_id: asGuest ? null : buyerId,
        guest_name: asGuest ? GUEST_NAMES[h % GUEST_NAMES.length] : null,
        purchased_at: new Date(PURCHASE_EPOCH - (h % 60) * 86400000),
      });
    });
  }
  if (purchaseRows.length > 0) {
    await db
      .insert(purchases)
      .values(purchaseRows)
      .onConflictDoUpdate({
        target: purchases.id,
        set: {
          user_id: sql`excluded.user_id`,
          guest_name: sql`excluded.guest_name`,
          purchased_at: sql`excluded.purchased_at`,
        },
      });
  }
  console.log(`  purchases: ${purchaseRows.length} upserted`);

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
