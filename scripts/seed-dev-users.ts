/**
 * Idempotent dev-only seed. Creates the bypass test viewer plus a small social
 * graph (mutual + one-way follows, public lists with items, visit history, and
 * bookmarks) so the home-page rails have content in local mode (USE_PG_DRIVER=1,
 * which routes the app at the localhost Docker Postgres AND bypasses auth — see
 * lib/auth.ts and CLAUDE.md "Local dev + e2e").
 *
 * Run with: `npm run db:seed:dev`. Safe to re-run — all inserts use
 * deterministic IDs and `.onConflictDoNothing()`. Hard-fails on production.
 *
 * --------------------------------------------------------------------------
 * Seed-as-fixture (testing-foundation capability).
 *
 * This file is the canonical E2E fixture. E2E specs assert against the
 * entities created here (users, lists, items, visits, follows). Any edit
 * that adds, removes, or changes the identity/visibility of a seeded entity
 * is a breaking change to the E2E suite — accompany it with a review of
 * the e2e/ specs that touch the affected entities, in the same change.
 *
 * Reset:  npm run db:reset:dev
 * Apply:  npm run db:seed:dev
 * --------------------------------------------------------------------------
 */
import 'dotenv/config';
import { inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  item_stores,
  items,
  list_items,
  list_visits,
  lists,
  purchases,
  user_follows,
  users,
} from '../db/schema';
import { VISIBILITY, type ListVisibility } from '../lib/visibility';

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
  { slug: 'kim', first: 'Kim', bg: '#9333ea' },
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
  subtitle?: string;
  occasion: string;
  user_id: string;
  visibility: ListVisibility;
  itemNames: string[];
};

// Item-name pool — sized large enough that any single list pulling 15–20
// consecutive entries still looks plausible. Each list takes a deterministic
// slice (offset by hash of list ID), so reseeds produce the same items.
const ITEM_POOL = [
  'Cast-iron skillet',
  'Bluetooth speaker',
  'Pour-over kettle',
  'Linen napkins',
  'Ceramic planter',
  'Wool throw blanket',
  'Stand mixer',
  'Knife block',
  'Espresso machine',
  'Dutch oven',
  'Stroller',
  'Crib mobile',
  'Baby monitor',
  'Ski goggles',
  'Wool socks',
  'Hardcover novel',
  'Mechanical keyboard',
  'Standing desk mat',
  'Noise-cancelling headphones',
  'Whiskey decanter',
  'Cigar humidor',
  'Leather wallet',
  'Aroma diffuser',
  'Yoga mat',
  'Travel mug',
  'Card game',
  'Cookbook',
  'Hand cream',
  'Tote bag',
  'Bath towels',
  'Decorative mirror',
  'Wine opener',
  'Cheese board',
  'Picture frames',
  'Slippers',
  'Reading lamp',
  'French press',
  'Notebook',
  'Massage gun',
  'Air fryer',
  'Cocktail shaker',
  'Linen sheets',
  'Cashmere scarf',
  'Walking shoes',
  'Smart watch',
  'Garden tools',
  'Pizza stone',
  'Tea kettle',
  'Vinyl record',
  'Headphone stand',
];

// Deterministic hash for stable per-list offsets.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Description pool — mix of short notes and longer paragraphs so layout
// preview covers single-line, multi-line wrap, and overflow truncation. ~20%
// of items get an empty description (h % 5 === 0) to keep the empty-state
// reachable from a fresh seed.
const DESCRIPTION_POOL = [
  'Color and finish are flexible — surprise me.',
  'Already have the small size; looking for the larger one this time around.',
  'Matte black preferred, but any neutral works.',
  "Please get the rechargeable version, not battery-powered — we've got a drawer full of AAs already.",
  "Saw this at a friend's place last month and have been thinking about it ever since. Bonus points if it comes in walnut.",
  'No rush on this one — happy to wait for a sale.',
  'Open to any brand as long as the reviews are solid.',
  'The linked one is ideal, but any comparable model is great. Mostly just want something that actually lasts.',
  'Would love this in cream or sage; nothing too bright.',
  'For the kitchen remodel — should match the brushed-nickel hardware we already have.',
  'Quality over quantity here. Rather have one good one than two cheap ones.',
  'Travel-friendly size if possible — going on a trip in the spring.',
  'Need this before the move in July if anyone is feeling generous.',
  "Bonus points for something that's dishwasher-safe; I am not a hand-wash person.",
  'Replacing one that finally gave up after eight years of daily use. Long live the next one.',
];

// Deterministic description picker: hash item id, ~20% empty, otherwise pick
// from the pool. Keeps re-seeds stable.
function descriptionFor(itemId: string): string {
  const h = hash(itemId);
  if (h % 5 === 0) return '';
  return DESCRIPTION_POOL[h % DESCRIPTION_POOL.length];
}

// Build itemNames for a list: 15–20 items, sliced from ITEM_POOL at a stable
// offset. Wraps around the pool to support overlap between lists.
function itemsForList(listId: string): string[] {
  const h = hash(listId);
  const count = 15 + (h % 6); // 15..20
  const offset = h % ITEM_POOL.length;
  const out: string[] = [];
  for (let i = 0; i < count; i++)
    out.push(ITEM_POOL[(offset + i) % ITEM_POOL.length]);
  return out;
}

// Purchase fan-out per item:
//   qty_limit = 3:       1 (partial) or 3 (fully-claimed), per listIdx parity
//   qty_limit = null:    1 (single buyer) or 4 (many buyers), per listIdx parity
//   qty_limit = 1:       0 or 1 via stride derived from the target ratio —
//                        viewer's archived items run hotter (~70%) since
//                        archived often means purchased.
function purchaseCountFor(
  item: {
    user_id: string;
    archived_at: Date | null;
    quantity_limit: number | null;
  },
  listIdx: number,
  itemIdx: number,
  baseRatio: number
): number {
  if (item.quantity_limit === 3) return listIdx % 2 === 0 ? 1 : 3;
  if (item.quantity_limit === null) return listIdx % 2 === 0 ? 1 : 4;
  const effectiveRatio =
    item.user_id === VIEWER_ID && item.archived_at ? 0.7 : baseRatio;
  const stride = Math.max(1, Math.round(1 / effectiveRatio));
  return itemIdx % stride === 0 ? 1 : 0;
}

// Viewer-owned lists — 15 of them across varied occasions to force both the
// MyListsRail horizontal scroll and the /lists page vertical scroll.
const VIEWER_LIST_TEMPLATES: {
  slug: string;
  name: string;
  subtitle?: string;
  occasion: string;
  visibility: ListVisibility;
}[] = [
  {
    slug: 'birthday',
    name: "Test Viewer's Birthday",
    occasion: 'Birthday',
    visibility: VISIBILITY.FOLLOWERS,
  },
  {
    slug: 'housewarming',
    name: 'Housewarming Wishes',
    occasion: 'Housewarming',
    visibility: VISIBILITY.OWNER,
  },
  {
    slug: 'holiday-2026',
    name: 'Holiday 2026',
    subtitle: 'Group gift exchange',
    occasion: 'Holiday',
    visibility: VISIBILITY.FOLLOWERS,
  },
  {
    slug: 'anniversary',
    name: 'Anniversary Picks',
    occasion: 'Anniversary',
    visibility: VISIBILITY.LINK,
  },
  {
    slug: 'wedding-registry',
    name: 'Wedding Registry',
    subtitle: 'Brandy Family',
    occasion: 'Wedding',
    visibility: VISIBILITY.FOLLOWERS,
  },
  {
    slug: 'kitchen-upgrade',
    name: 'Kitchen Upgrade',
    occasion: 'Just Because',
    visibility: VISIBILITY.OWNER,
  },
  {
    slug: 'fitness-goals',
    name: 'Fitness Goals',
    occasion: 'Self-Care',
    visibility: VISIBILITY.FOLLOWERS,
  },
  {
    slug: 'home-office',
    name: 'Home Office Refresh',
    occasion: 'Just Because',
    visibility: VISIBILITY.LINK,
  },
  {
    slug: 'reading-stack',
    name: 'Reading Stack',
    occasion: 'Just Because',
    visibility: VISIBILITY.FOLLOWERS,
  },
  {
    slug: 'camping-trip',
    name: 'Camping Trip Gear',
    occasion: 'Adventure',
    visibility: VISIBILITY.FOLLOWERS,
  },
  {
    slug: 'baby-shower',
    name: 'Baby Shower Wishlist',
    subtitle: "It's a girl!",
    occasion: 'Baby Shower',
    visibility: VISIBILITY.FOLLOWERS,
  },
  {
    slug: 'graduation',
    name: 'Graduation Picks',
    occasion: 'Graduation',
    visibility: VISIBILITY.LINK,
  },
  {
    slug: 'fathers-day',
    name: "Father's Day Ideas",
    occasion: 'Holiday',
    visibility: VISIBILITY.OWNER,
  },
  {
    slug: 'mothers-day',
    name: "Mother's Day Ideas",
    occasion: 'Holiday',
    visibility: VISIBILITY.OWNER,
  },
  {
    slug: 'spring-garden',
    name: 'Spring Garden',
    occasion: 'Hobby',
    visibility: VISIBILITY.FOLLOWERS,
  },
];

// Friend-owned lists — 1–2 per friend, all public so the viewer can visit
// them. Mix of occasions for visual variety.
const FRIEND_LIST_TEMPLATES: {
  friendSlug: string;
  slug: string;
  name: string;
  subtitle?: string;
  occasion: string;
  visibility?: ListVisibility;
}[] = [
  {
    friendSlug: 'alice',
    slug: 'wedding',
    name: "Alice's Wedding Registry",
    subtitle: 'Smith ⋈ Lee · June 2026',
    occasion: 'Wedding',
  },
  {
    friendSlug: 'alice',
    slug: 'baby',
    name: 'Baby On The Way',
    occasion: 'Baby Shower',
  },
  {
    friendSlug: 'bob',
    slug: 'holiday',
    name: "Bob's Holiday List",
    occasion: 'Holiday',
  },
  {
    friendSlug: 'bob',
    slug: 'birthday',
    name: "Bob's Birthday",
    occasion: 'Birthday',
  },
  {
    friendSlug: 'carol',
    slug: 'graduation',
    name: "Carol's Graduation",
    occasion: 'Graduation',
  },
  {
    friendSlug: 'dave',
    slug: 'birthday',
    name: "Dave's Big 4-0",
    occasion: 'Birthday',
  },
  {
    friendSlug: 'eve',
    slug: 'housewarming',
    name: "Eve's New Place",
    occasion: 'Housewarming',
  },
  {
    friendSlug: 'eve',
    slug: 'wedding',
    name: "Eve's Wedding",
    occasion: 'Wedding',
  },
  {
    friendSlug: 'frank',
    slug: 'holiday',
    name: "Frank's Holiday Wishes",
    occasion: 'Holiday',
  },
  {
    friendSlug: 'grace',
    slug: 'birthday',
    name: "Grace's Birthday",
    occasion: 'Birthday',
  },
  {
    friendSlug: 'grace',
    slug: 'self-care',
    name: "Grace's Self-Care",
    subtitle: 'Mostly skincare, no makeup pls',
    occasion: 'Self-Care',
  },
  {
    friendSlug: 'hank',
    slug: 'anniversary',
    name: "Hank & Spouse's Anniversary",
    subtitle: '10 years!',
    occasion: 'Anniversary',
  },
  {
    friendSlug: 'iris',
    slug: 'birthday',
    name: 'Iris Turns 25',
    occasion: 'Birthday',
  },
  {
    friendSlug: 'jack',
    slug: 'graduation',
    name: "Jack's Graduation",
    subtitle: 'Med school, finally',
    occasion: 'Graduation',
  },
  {
    friendSlug: 'jack',
    slug: 'holiday',
    name: "Jack's Holiday",
    occasion: 'Holiday',
  },
  // testing-foundation: spike audit additions. These three lists give the
  // E2E fixture a friend-owned OWNER list, a friend-owned LINK list, and a
  // new friend (kim) owning a FOLLOWERS list with no list_visits row for
  // the viewer. dave + jack are existing not-followed-by-viewer friends.
  {
    friendSlug: 'dave',
    slug: 'private-wishlist',
    name: "Dave's private wishlist",
    occasion: 'Just Because',
    visibility: VISIBILITY.OWNER,
  },
  {
    friendSlug: 'jack',
    slug: 'unlisted-plans',
    name: "Jack's shared-by-link plans",
    occasion: 'Just Because',
    visibility: VISIBILITY.LINK,
  },
  {
    friendSlug: 'kim',
    slug: 'birthday',
    name: "Kim's Birthday",
    occasion: 'Birthday',
    visibility: VISIBILITY.FOLLOWERS,
  },
];

const seedLists: SeedList[] = [
  ...VIEWER_LIST_TEMPLATES.map((t) => {
    const id = `dev-list-viewer-${t.slug}`;
    return {
      id,
      name: t.name,
      subtitle: t.subtitle,
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
      subtitle: t.subtitle,
      occasion: t.occasion,
      user_id: friendId(t.friendSlug),
      visibility: t.visibility ?? VISIBILITY.FOLLOWERS,
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
// Bookmarks rail has plenty of content too. Kim is excluded per the
// testing-foundation spike audit: kim must have zero list_visits rows so
// the "user with no visit history from the viewer" surface is reachable
// directly from the seed.
const seedVisits: SeedVisit[] = FRIEND_LIST_TEMPLATES.filter(
  (t) => t.friendSlug !== 'kim'
).map((t, idx) => ({
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
  // Friend ↔ friend mutuals: Alice is mutual with every other friend, so her
  // lists' attributed-purchaser picker has a pool big enough to scroll (~10
  // rows) and a markable target besides the viewer (the attributed-claim e2e
  // spec picks Bob from this pool). Only Alice's edges — the viewer's own
  // counts and mutuals are untouched.
  ...FRIENDS.filter((f) => f.slug !== 'alice').flatMap((f) => [
    { follower_id: friendId('alice'), followee_id: friendId(f.slug) },
    { follower_id: friendId(f.slug), followee_id: friendId('alice') },
  ]),
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
  // onConflictDoUpdate so reseeds pick up edits to subtitle/visibility on
  // already-seeded rows (same pattern as items below).
  await db
    .insert(lists)
    .values(
      seedLists.map((l) => {
        const shared = l.visibility !== VISIBILITY.OWNER;
        return {
          id: l.id,
          name: l.name,
          subtitle: l.subtitle ?? null,
          occasion: l.occasion,
          user_id: l.user_id,
          visibility: l.visibility,
          shared,
          shared_at: shared ? sharedAt : null,
        };
      })
    )
    .onConflictDoUpdate({
      target: lists.id,
      set: {
        subtitle: sql`excluded.subtitle`,
        visibility: sql`excluded.visibility`,
        shared: sql`excluded.shared`,
        shared_at: sql`excluded.shared_at`,
      },
    });
  console.log(`  lists: ${seedLists.length} upserted`);

  // Items + list_items: deterministic IDs derived from list id + position so
  // re-runs are no-ops. Use picsum.photos seeded by item id for deterministic
  // realistic photos (ItemPhoto renders a plain <img>, so no remotePatterns
  // entry is needed). Images won't match the item name semantically — that's
  // fine for layout/design preview.
  // Archive ~20% of viewer-owned items so the /items archived filter has
  // content. Fixed reference epoch keeps archived_at stable across reseeds.
  const ARCHIVE_EPOCH = new Date('2026-04-01T00:00:00Z').getTime();
  // Rotate quantity_limit across positions [0, 1, last] on a 3-list cycle so
  // every position renders every value (3, null, 1) once per cycle. Lets the
  // preview surface multi-claim, unlimited, and single-claim layouts at known
  // positions without manual UI clicking.
  const QTY_ROTATION: (number | null)[][] = [
    [3, null, 1], // listIdx % 3 === 0
    [null, 1, 3], // listIdx % 3 === 1
    [1, 3, null], // listIdx % 3 === 2
  ];
  const itemRows: {
    id: string;
    name: string;
    description: string;
    user_id: string;
    image_url: string;
    archived_at: Date | null;
    quantity_limit: number | null;
  }[] = [];
  const listItemRows: { list_id: string; item_id: string; position: number }[] =
    [];
  seedLists.forEach((list, listIdx) => {
    const rotation = QTY_ROTATION[listIdx % QTY_ROTATION.length];
    const lastIdx = list.itemNames.length - 1;
    list.itemNames.forEach((name, idx) => {
      const itemId = `${list.id}-item-${idx + 1}`;
      const h = hash(itemId);
      const archive = list.user_id === VIEWER_ID && h % 5 === 0; // ~20% of viewer items
      let quantity_limit: number | null = 1;
      if (idx === 0) quantity_limit = rotation[0];
      else if (idx === 1) quantity_limit = rotation[1];
      else if (idx === lastIdx) quantity_limit = rotation[2];
      itemRows.push({
        id: itemId,
        name,
        description: descriptionFor(itemId),
        user_id: list.user_id,
        image_url: `https://picsum.photos/seed/${itemId}/400/400`,
        archived_at: archive
          ? new Date(ARCHIVE_EPOCH - (h % 30) * 86400000)
          : null,
        quantity_limit,
      });
      listItemRows.push({ list_id: list.id, item_id: itemId, position: idx });
    });
  });
  // onConflictDoUpdate so re-runs apply new image_url, archived_at, and
  // quantity_limit to previously-seeded rows.
  await db
    .insert(items)
    .values(itemRows)
    .onConflictDoUpdate({
      target: items.id,
      set: {
        description: sql`excluded.description`,
        image_url: sql`excluded.image_url`,
        archived_at: sql`excluded.archived_at`,
        quantity_limit: sql`excluded.quantity_limit`,
      },
    });
  await db.insert(list_items).values(listItemRows).onConflictDoNothing();
  console.log(
    `  items: ${itemRows.length} upserted, list_items: ${listItemRows.length} upserted`
  );

  // Item stores — each item gets 1–3 stores with realistic-looking names,
  // prices (stored as text per schema), and links. Deterministic IDs and a
  // rotating store catalog keep re-runs idempotent and visually varied.
  // Prices are bare numeric strings — StoreLinks.tsx filters out stores where
  // Number(price) is NaN, and re-adds the `$` at render time.
  const STORE_CATALOG: { name: string; link: string; price: string }[] = [
    {
      name: 'Amazon',
      link: 'https://www.amazon.com/dp/B08EXAMPLE',
      price: '48.99',
    },
    {
      name: 'Target',
      link: 'https://www.target.com/p/-/A-12345678',
      price: '52.00',
    },
    {
      name: 'Williams Sonoma',
      link: 'https://www.williams-sonoma.com/products/example',
      price: '79.95',
    },
    {
      name: 'Crate & Barrel',
      link: 'https://www.crateandbarrel.com/example/s12345',
      price: '64.00',
    },
    {
      name: 'West Elm',
      link: 'https://www.westelm.com/products/example-h1234',
      price: '89.00',
    },
    {
      name: 'Etsy',
      link: 'https://www.etsy.com/listing/123456789/example',
      price: '35.50',
    },
  ];
  // Hand-authored edge case: a high price plus a store name too long for
  // even one named slot, so the card metadata line's name-truncation +
  // non-truncating "+N" count is reachable straight from the seed.
  const LONG_STORE_ITEM = 'dev-list-alice-baby-item-2';
  const LONG_STORE_ROWS = [
    {
      name: 'Really long store name that carries really cool items',
      link: 'https://www.example.com/really-long-store',
      price: '1000.00',
    },
    {
      name: 'Williams Sonoma',
      link: 'https://www.williams-sonoma.com/products/example',
      price: '1249.95',
    },
    {
      name: 'Crate & Barrel',
      link: 'https://www.crateandbarrel.com/example/s12345',
      price: '1399.00',
    },
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
    const hash = item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const catalog =
      item.id === LONG_STORE_ITEM
        ? LONG_STORE_ROWS
        : // 1–3 stores per item, deterministic by item id hash.
          Array.from(
            { length: (hash % 3) + 1 },
            (_, i) => STORE_CATALOG[(hash + i) % STORE_CATALOG.length]
          );
    catalog.forEach((store, i) => {
      storeRows.push({
        id: `${item.id}-store-${i + 1}`,
        item_id: item.id,
        name: store.name,
        link: store.link,
        price: store.price,
        order: i + 1,
      });
    });
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
    claimed_by: string | null;
    guest_name: string | null;
    purchased_at: Date;
  }[] = [];
  // Hand-authored claim rows so every unclaim-matrix branch (claimer,
  // purchaser, owner master unclaim, guest name-match) and the owner
  // spoiler-view "added by" label are reachable straight from the seed.
  // The fan-out loop below skips these items to keep capacity deterministic.
  const ATTRIBUTION_EPOCH = new Date('2026-05-15T00:00:00Z');
  const specialClaimRows = [
    {
      // Attributed claim on a viewer-owned item (limit 3): Alice marked Bob
      // as the purchaser. Owner spoiler view shows "Bob — added by Alice";
      // the owner-spoiler e2e spec master-unclaims this exact row.
      id: 'dev-purchase-attributed',
      item_id: 'dev-list-viewer-birthday-item-1',
      user_id: friendId('bob'),
      claimed_by: friendId('alice'),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      // The viewer as attributed purchaser on a friend's list: Bob marked the
      // viewer. The viewer sees it as their own claim ('self') and can unclaim.
      id: 'dev-purchase-attributed-to-viewer',
      item_id: 'dev-list-alice-wedding-item-1',
      user_id: VIEWER_ID,
      claimed_by: friendId('bob'),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      // Owner self-claim (unlimited item): claimer and purchaser are both the
      // owner — the spoiler-view "I bought this myself" state.
      id: 'dev-purchase-owner-self',
      item_id: 'dev-list-viewer-birthday-item-2',
      user_id: VIEWER_ID,
      claimed_by: VIEWER_ID,
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      // Legacy-shape signed-out guest row (all-NULL identities): self-serve
      // removal is the exact-name match; the owner escape hatch is master
      // unclaim.
      id: 'dev-purchase-legacy-guest',
      item_id: 'dev-list-viewer-birthday-item-3',
      user_id: null,
      claimed_by: null,
      guest_name: 'Grandma',
      purchased_at: ATTRIBUTION_EPOCH,
    },
  ];
  const specialClaimItems = new Set(specialClaimRows.map((r) => r.item_id));
  // Position-based selection per list (rather than global hash) so every list
  // — including small friend lists — gets a guaranteed share. For each list,
  // mark every Nth item as purchased. Multi-claim and unlimited items receive
  // multiple purchase rows (fan-out) so partial- and fully-claimed UI states
  // are reachable from seeded data alone.
  seedLists.forEach((list, listIdx) => {
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
      if (specialClaimItems.has(itemId)) return;
      const item = itemRows.find((r) => r.id === itemId);
      if (!item) return;

      const purchaseCount = purchaseCountFor(item, listIdx, idx, purchaseRatio);
      if (purchaseCount === 0) return;

      // Eligible buyer pool (owner excluded). Rotate by (h + n) so each
      // multi-buyer item picks distinct buyers across its purchase rows.
      const pool =
        item.user_id === VIEWER_ID
          ? friendIds
          : [VIEWER_ID, ...friendIds].filter((id) => id !== item.user_id);

      for (let n = 1; n <= purchaseCount; n++) {
        const h = hash(`${itemId}-${n}`);
        const asGuest = h % 8 === 0;
        const buyerId = pool[(h + n) % pool.length];
        purchaseRows.push({
          id: `${itemId}-purchase-${n}`,
          item_id: itemId,
          user_id: asGuest ? null : buyerId,
          // Self-claim shape: the buyer asserted their own claim. Guest rows
          // keep the signed-out shape (all-NULL identities).
          claimed_by: asGuest ? null : buyerId,
          guest_name: asGuest ? GUEST_NAMES[h % GUEST_NAMES.length] : null,
          purchased_at: new Date(PURCHASE_EPOCH - ((h + n) % 60) * 86400000),
        });
      }
    });
  });
  purchaseRows.push(...specialClaimRows);
  // Drop legacy unsuffixed purchase IDs from prior seed versions before
  // inserting the new -purchase-N rows. Without this, an old -purchase row
  // would coexist with the new -purchase-1 row on the same item and inflate
  // claim counts. Scoped to the seed's deterministic ID shape; never touches
  // user-created purchases (which use UUID-style IDs).
  await db.execute(
    sql`DELETE FROM purchases WHERE id LIKE '%-purchase' AND id NOT LIKE '%-purchase-%'`
  );
  if (purchaseRows.length > 0) {
    await db
      .insert(purchases)
      .values(purchaseRows)
      .onConflictDoUpdate({
        target: purchases.id,
        set: {
          user_id: sql`excluded.user_id`,
          claimed_by: sql`excluded.claimed_by`,
          guest_name: sql`excluded.guest_name`,
          purchased_at: sql`excluded.purchased_at`,
        },
      });
  }
  console.log(`  purchases: ${purchaseRows.length} upserted`);

  await db.insert(user_follows).values(seedFollows).onConflictDoNothing();
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

// Exit explicitly: under USE_PG_DRIVER=1 the postgres-js pool keeps an open
// connection, so Node would otherwise hang after `main()` resolves instead of
// returning — which deadlocks `npm run test:e2e` (the e2e setup seeds before
// Playwright runs). All writes are awaited inside `main()`, so exiting here is
// safe. (The neon-http path has no persistent pool and would exit on its own;
// this just makes it unconditional. Mirrors scripts/ci/neon-driver-smoke.ts.)
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed-dev-users] Failed:', err);
    process.exit(1);
  });
