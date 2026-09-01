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
import { inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  ACCENT_PREFERENCE_ID,
  SPOILER_PREFERENCE_ROWS,
  SPOILER_TIER_PREFERENCE_ID,
  item_images,
  item_stores,
  items,
  list_items,
  list_visits,
  lists,
  preferences,
  profile_avatars,
  profile_members,
  profile_preferences,
  profiles,
  purchases,
  user_follows,
  users,
} from '../db/schema';
import { seedUserEmail } from '../lib/auth';
import { ROLES } from '../lib/data/profile.roles';
import { styleOf } from '../lib/altvatar/registry';
import { openmojiArtUrl } from '../lib/altvatar/styles/openmoji';
import { renderAltvatar } from '../lib/altvatar/render';
import { offersOf } from '../lib/altvatar/resolve';
import type {
  AltvatarStyle,
  AltvatarStyleId,
  Selections,
} from '../lib/altvatar/types';
import type { SpoilerTier } from '../lib/types';
import { VISIBILITY, type ListVisibility } from '../lib/visibility';

if (process.env.NODE_ENV === 'production') {
  console.error('[seed-dev-users] Refusing to run with NODE_ENV=production');
  process.exit(1);
}

const VIEWER_ID = 'dev-test-viewer';

// The two un-onboarded fixtures, one per arm of `onboarding-gate`'s latch.
// Neither is the primary viewer: the viewer is onboarded, so every other spec
// and every local page renders the application rather than the gate.
//
// SIGNUP holds an account row and nothing else — no profile, no membership —
// which is the state an account is in between sign-in and the gate's submit.
// EXISTING holds a self-profile carrying no Altvatar art, which is the state
// the phase-1 backfill left every account that predates the gate in. They are
// reached through BYPASS_SESSION_USER, one Playwright server mode each, and
// nothing submits against them: the latch is one-shot per seeded database, so
// a spec that completed the gate would consume the fixture for every run after
// it.
const SIGNUP_FIXTURE_ID = 'dev-unonboarded-signup';
const EXISTING_FIXTURE_ID = 'dev-unonboarded-existing';

// `users.image` carries no seeded value: a profile's face comes from its own
// Altvatar row and never from the account, so a synthesized account image would
// be a source nothing reads. NextAuth still writes the column on sign-in; the
// application asks it for nothing.
type SeedUser = { id: string; name: string; email: string };
// Expanded roster — enough friends to push the Following rail past horizontal
// scroll and to give Recently Visited / Bookmarks enough variety.
const FRIENDS: { slug: string; first: string }[] = [
  { slug: 'alice', first: 'Alice' },
  { slug: 'bob', first: 'Bob' },
  { slug: 'carol', first: 'Carol' },
  { slug: 'dave', first: 'Dave' },
  { slug: 'eve', first: 'Eve' },
  { slug: 'frank', first: 'Frank' },
  { slug: 'grace', first: 'Grace' },
  { slug: 'hank', first: 'Hank' },
  { slug: 'iris', first: 'Iris' },
  { slug: 'jack', first: 'Jack' },
  { slug: 'kim', first: 'Kim' },
];
const friendId = (slug: string) => `dev-friend-${slug}`;
const selfProfileOf = (userId: string) => `self-${userId}`;
// A list and its items must land on the same profile: a list pinned to an
// owned profile whose items stayed on the account's self-profile renders as a
// stranger's items to the profile that owns the list.
const listProfileOf = (list: { user_id: string; profile_id?: string }) =>
  list.profile_id ?? selfProfileOf(list.user_id);
const seedUsers: SeedUser[] = [
  {
    id: VIEWER_ID,
    name: 'Test Viewer',
    email: seedUserEmail(VIEWER_ID),
  },
  ...FRIENDS.map((f) => ({
    id: friendId(f.slug),
    name: `${f.first} Example`,
    email: seedUserEmail(friendId(f.slug)),
  })),
  {
    id: SIGNUP_FIXTURE_ID,
    name: 'Newly Signed Up',
    email: seedUserEmail(SIGNUP_FIXTURE_ID),
  },
  {
    id: EXISTING_FIXTURE_ID,
    name: 'Faceless Veteran',
    email: seedUserEmail(EXISTING_FIXTURE_ID),
  },
];

// Everyone but the signup fixture, which holds no profile and no membership by
// definition — that absence is the whole of what the gate's first arm reads.
const profiledUsers = seedUsers.filter((u) => u.id !== SIGNUP_FIXTURE_ID);

// The two account-less profile fixtures, named for the viewer's role on each:
// the viewer is `owner` on the first and `manager` on the second, so between
// them and their own self-profile the viewer runs all three roles. The
// `manager` role — the one the membership floor admits and #194 later narrows —
// is therefore covered by a fixture rather than only by a unit test.
const OWNED_PROFILE_ID = 'dev-profile-owned';
const MANAGED_PROFILE_ID = 'dev-profile-managed';

// A third seat, also `manager`, existing only so that e2e has a managed profile
// it may write on. MANAGED_PROFILE_ID cannot serve: it is simultaneously the
// never-acted-as ordering fixture and the empty-lists fixture, and both are
// consumed by the first flow that acts as it — a manager may create lists and
// items but may delete neither, so nothing it writes can be cleaned up.
const WORKSHOP_PROFILE_ID = 'dev-profile-workshop';

// A fourth seat, whose only fixture is a claim-visibility baseline an owner
// writes. Workshop cannot serve: `roles-manager.auth.spec` reads its list in a
// parallel worker and depends on the viewer's baseline staying at `nothing` —
// the reorder layout is one of the two things the item level decides — so a
// flow that raises it there races that spec for the window it is raised.
const VISIBILITY_PROFILE_ID = 'dev-profile-visibility';

// Member baseline tiers, now account-keyed `profile_preferences` rows rather
// than columns on the membership. Only seats that must differ from the resolved
// default carry a row: an absent row resolves to `surprise` (PROTECTED_TIER), so
// every self membership and every fully-protected fixture needs none. The owned
// profile is the identity seat — the viewer sits at `identity` so the
// namable-recorder rendering is reachable in local mode by switching to it, and
// a second member is pinned explicitly to `surprise` so the set-to-protected row
// (distinct from an absent one) is itself a fixture.
const MEMBER_SPOILER_TIERS: {
  profile_id: string;
  user_id: string;
  tier: SpoilerTier;
}[] = [
  { profile_id: OWNED_PROFILE_ID, user_id: VIEWER_ID, tier: 'identity' },
  {
    profile_id: OWNED_PROFILE_ID,
    user_id: friendId('alice'),
    tier: 'surprise',
  },
];

// Accents and Altvatars for a slice of the roster, so every branch of the
// avatar disc is on screen at once: art on an accent, initials on an accent,
// and the unset fallback. `kim` and MANAGED_PROFILE_ID carry neither on
// purpose — a seed where everything has a face hides the fallback path that
// most real profiles start in.
//
//
// The viewer carries art on purpose: art is what `onboarding-gate` latches on,
// so a viewer without it would meet the gate on every local page and in front
// of every e2e spec. EXISTING_FIXTURE_ID is the profile deliberately left
// without it, and it is not the viewer.
const SEEDED_FACES: Record<
  string,
  { accent: string; face?: AltvatarStyleId; glyph?: string }
> = {
  [selfProfileOf(VIEWER_ID)]: { accent: 'midnight', face: 'avataaars' },
  [selfProfileOf(friendId('alice'))]: { accent: 'rose', face: 'personas' },
  [selfProfileOf(friendId('bob'))]: { accent: 'denim', face: 'avataaars' },
  // The thing kind's fixtures: a dog and a rocket, codepoints per OpenMoji.
  [selfProfileOf(friendId('carol'))]: {
    accent: 'lion',
    face: 'openmoji',
    glyph: '1F415',
  },
  [selfProfileOf(friendId('dave'))]: { accent: 'juniper', face: 'avataaars' },
  [selfProfileOf(friendId('eve'))]: { accent: 'nebula', face: 'personas' },
  [selfProfileOf(friendId('frank'))]: {
    accent: 'fathom',
    face: 'openmoji',
    glyph: '1F680',
  },
  [selfProfileOf(friendId('grace'))]: { accent: 'coral', face: 'avataaars' },
  [selfProfileOf(friendId('hank'))]: { accent: 'clover', face: 'toon-head' },
  // Accent, no art: the initials-on-an-accent-disc branch.
  [selfProfileOf(friendId('iris'))]: { accent: 'oasis' },
  [selfProfileOf(friendId('jack'))]: { accent: 'slate' },
  // OWNED_PROFILE_ID is absent on purpose: e2e/profiles.auth.spec.ts opens its
  // space to prove the no-accent-row branch rolls a suggestion, so seeding it
  // one would erase the only fixture for that path.
  //
  // EXISTING_FIXTURE_ID's self-profile is absent for a different reason: no art
  // is exactly what leaves that account un-onboarded, so giving it a face here
  // would silently retire the gate's second arm.
};

// A colour axis has no seed-driven default — left unset, every face lands on
// the same skin and hair — so each is picked from its own palette by a hash of
// the profile id. Hashing rather than `shuffleAltvatar` keeps a re-run's faces
// identical to the last run's, which is what makes them usable as fixtures.
function seededSelections(style: AltvatarStyle, key: string): Selections {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const selections: Selections = {};
  for (const offer of offersOf(style)) {
    if (offer.kind !== 'color') continue;
    selections[offer.axis] = offer.palette[hash++ % offer.palette.length].value;
  }
  return selections;
}

// Last-acted-as fixtures. Absolute rather than relative to the seed run, so a
// switcher ordered most-recently-acted-as first is testable against values that
// do not move; far enough apart that a broken ordering cannot pass by accident.
// `dev-profile-managed` is deliberately absent from this map: NULL is the
// never-acted-as ordering branch's fixture, and no e2e flow may consume it,
// because a switch stamps the row and no affordance unsets it.
const LAST_ACTIVE_AT: Record<string, Date> = {
  [selfProfileOf(VIEWER_ID)]: new Date('2026-08-20T12:00:00Z'),
  [OWNED_PROFILE_ID]: new Date('2026-02-14T09:00:00Z'),
  // Stamped, so the NULL ordering branch stays a fixture of exactly one row.
  [WORKSHOP_PROFILE_ID]: new Date('2026-03-01T09:00:00Z'),
};

type SeedList = {
  id: string;
  name: string;
  subtitle?: string;
  occasion: string;
  user_id: string;
  // A managed profile owns lists but has no account, so the owning profile is
  // named directly where it is not a seeded user's own. `user_id` still carries
  // the account whose reset sweep reaches the row.
  profile_id?: string;
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
// preview covers single-line and multi-line wrap; every entry fits the
// 100-char DESCRIPTION_MAX and one sits exactly at the cap so the
// rendered-in-full boundary is reachable from a fresh seed. ~20% of items
// get an empty description (h % 5 === 0) to keep the empty-state reachable.
const DESCRIPTION_POOL = [
  'Color and finish are flexible — surprise me.',
  'Already have the small size; looking for the larger one this time around.',
  'Matte black preferred, but any neutral works.',
  "Please get the rechargeable version, not battery-powered — we've got a drawer full of AAs already.",
  "Saw this one at a friend's place last month and I cannot stop thinking about it. Bonus if in walnut.",
  'No rush on this one — happy to wait for a sale.',
  'Open to any brand as long as the reviews are solid.',
  'The linked one is ideal, but any comparable model is great. Mostly want something that lasts.',
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
  item: { archived_at: Date | null; quantity_limit: number | null },
  ownerId: string,
  listIdx: number,
  itemIdx: number,
  baseRatio: number
): number {
  if (item.quantity_limit === 3) return listIdx % 2 === 0 ? 1 : 3;
  if (item.quantity_limit === null) return listIdx % 2 === 0 ? 1 : 4;
  const effectiveRatio =
    ownerId === VIEWER_ID && item.archived_at ? 0.7 : baseRatio;
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
  // The owned profile's own collection: what `/lists` renders once the viewer
  // switches to it, and the fixture the profile-switch e2e flow asserts against.
  {
    id: 'dev-list-owned-wishlist',
    name: 'Owned Profile Wishlist',
    subtitle: 'Turning six',
    occasion: 'Birthday',
    user_id: VIEWER_ID,
    profile_id: OWNED_PROFILE_ID,
    visibility: VISIBILITY.FOLLOWERS,
    itemNames: itemsForList('dev-list-owned-wishlist'),
  },
  // The manager seat's pre-existing content, owned by the profile's owner: what
  // makes an owner-floor refusal testable against rows the manager did not
  // create and cannot delete. Appended last so no earlier list's index-derived
  // fixtures (quantity rotation, imageless items) shift.
  {
    id: 'dev-list-workshop-wishlist',
    name: 'Workshop Profile Wishlist',
    subtitle: 'Seeded by the owner',
    occasion: 'Birthday',
    user_id: friendId('bob'),
    profile_id: WORKSHOP_PROFILE_ID,
    visibility: VISIBILITY.FOLLOWERS,
    itemNames: itemsForList('dev-list-workshop-wishlist'),
  },
  // The claim-visibility seat's content, so a baseline written by its owner has
  // something whose disclosure observably flips.
  {
    id: 'dev-list-visibility-wishlist',
    name: 'Visibility Profile Wishlist',
    subtitle: 'Seeded by the owner',
    occasion: 'Birthday',
    user_id: friendId('bob'),
    profile_id: VISIBILITY_PROFILE_ID,
    visibility: VISIBILITY.FOLLOWERS,
    itemNames: itemsForList('dev-list-visibility-wishlist'),
  },
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
// one-way (so followers count exceeds following count visually). The
// followee's profile column is derived below at insert time.
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

// Hand-authored linkless items (the door path's output): PRICED rows carry a
// linkless priced store row, BARE rows carry none. Seeded imageless so the
// placeholder-mint art matches what a door-created item looks like. Appended
// after each list's pool slice; excluded from the purchase fan-out (it walks
// itemNames). Returns item_id → price for the PRICED ones, consumed by the
// store-row loop.
const LINKLESS_EXTRAS: {
  list_id: string;
  name: string;
  description: string;
  price: string;
}[] = [
  {
    list_id: 'dev-list-viewer-birthday',
    name: 'Cash toward the house fund',
    description: 'Every bit gets us closer to the down payment.',
    price: '',
  },
  {
    list_id: 'dev-list-viewer-birthday',
    name: 'Coffee shop gift card',
    description: 'The one on 5th — I stop there every morning.',
    price: '25.00',
  },
  {
    list_id: 'dev-list-alice-wedding',
    name: 'A homemade dinner for two',
    description:
      'Your signature dish, delivered — better than any registry box.',
    price: '',
  },
  {
    list_id: 'dev-list-alice-wedding',
    name: 'Spa day gift card',
    description: 'Anywhere with a sauna — honeymoon recovery fund.',
    price: '50.00',
  },
];

function appendLinklessExtras(
  itemRows: {
    id: string;
    name: string;
    description: string;
    profile_id: string;
    image_url: string;
    archived_at: Date | null;
    quantity_limit: number | null;
  }[],
  listItemRows: { list_id: string; item_id: string; position: number }[]
): Map<string, string> {
  const pricedByItem = new Map<string, string>();
  LINKLESS_EXTRAS.forEach((extra, i) => {
    const list = seedLists.find((l) => l.id === extra.list_id)!;
    const itemId = `${extra.list_id}-linkless-${i + 1}`;
    itemRows.push({
      id: itemId,
      name: extra.name,
      description: extra.description,
      profile_id: listProfileOf(list),
      image_url: '',
      archived_at: null,
      quantity_limit: 1,
    });
    listItemRows.push({
      list_id: extra.list_id,
      item_id: itemId,
      position: list.itemNames.length + i,
    });
    if (extra.price !== '') pricedByItem.set(itemId, extra.price);
  });
  return pricedByItem;
}

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
    // Profiles first: they deliberately do NOT cascade from users, and the user
    // delete below cascades memberships away — membership is the only handle
    // onto a seeded profile, so after it every one of them is stranded.
    const deletedProfiles = await db
      .delete(profiles)
      .where(
        inArray(
          profiles.id,
          db
            .select({ id: profile_members.profile_id })
            .from(profile_members)
            .where(inArray(profile_members.user_id, seededIds))
        )
      )
      .returning({ id: profiles.id });
    console.log(
      `  reset: deleted ${deletedProfiles.length} profiles reachable from seeded users`
    );
    const deleted = await db
      .delete(users)
      .where(inArray(users.id, seededIds))
      .returning({ id: users.id });
    console.log(
      `  reset: deleted ${deleted.length} seeded users (children cascaded)`
    );
  }

  // Update name on conflict so re-runs pick up roster edits.
  await db
    .insert(users)
    .values(
      seedUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: new Date(),
      }))
    )
    .onConflictDoUpdate({
      target: users.id,
      set: { name: sql`excluded.name` },
    });
  console.log(`  users: ${seedUsers.length} upserted`);

  // The preferences catalog. Migrations insert these rows, but the local and
  // e2e databases are provisioned by `drizzle-kit push` straight from
  // db/schema.ts, which creates tables and replays no migration data — so
  // without them the accent and spoiler-tier writes fail their foreign key
  // everywhere but Neon.
  await db
    .insert(preferences)
    .values([
      { id: ACCENT_PREFERENCE_ID, name: 'Accent color', type: 'text' },
      ...SPOILER_PREFERENCE_ROWS,
    ])
    .onConflictDoNothing();

  // Profiles: one self-profile per seeded user (the invariant the migration
  // backfill guarantees in Neon) plus the two account-less fixtures.
  await db
    .insert(profiles)
    .values([
      ...profiledUsers.map((u) => ({
        id: selfProfileOf(u.id),
        name: u.name,
      })),
      { id: OWNED_PROFILE_ID, name: 'Owned Profile' },
      { id: MANAGED_PROFILE_ID, name: 'Managed Profile' },
      { id: WORKSHOP_PROFILE_ID, name: 'Workshop Profile' },
      { id: VISIBILITY_PROFILE_ID, name: 'Visibility Profile' },
    ])
    .onConflictDoNothing();

  // Accents and faces. Upserted rather than ignored on conflict so re-running
  // the seed after editing SEEDED_FACES actually repaints.
  const seededFaces = Object.entries(SEEDED_FACES);
  await db
    .insert(profile_preferences)
    .values(
      seededFaces.map(([profile_id, { accent }]) => ({
        profile_id,
        preference_id: ACCENT_PREFERENCE_ID,
        value: accent,
      }))
    )
    .onConflictDoUpdate({
      // The accent is the profile-wide (null-account) row, so its arbiter is
      // the partial unique index over (profile, preference) WHERE user_id IS
      // NULL — the predicate must be restated for Postgres to infer it.
      target: [
        profile_preferences.profile_id,
        profile_preferences.preference_id,
      ],
      targetWhere: isNull(profile_preferences.user_id),
      set: { value: sql`excluded.value` },
    });
  const avatarRows = await Promise.all(
    seededFaces
      .filter(([, f]) => f.face)
      .map(async ([profile_id, f]) => {
        const style = styleOf(f.face as string);
        // The thing kind's art is the route its bundled picture is served
        // from, exactly as the production write path stores it (see
        // profileAvatar.write.ts).
        if (style.id === 'openmoji') {
          const options = { seed: profile_id, selections: { glyph: f.glyph } };
          return {
            profile_id,
            style: style.id,
            options,
            art: openmojiArtUrl(f.glyph),
          };
        }
        const options = {
          seed: profile_id,
          selections: seededSelections(style, profile_id),
        };
        return {
          profile_id,
          style: style.id,
          options,
          art: await renderAltvatar(style.id, options),
        };
      })
  );
  await db
    .insert(profile_avatars)
    .values(avatarRows)
    .onConflictDoUpdate({
      target: profile_avatars.profile_id,
      set: {
        style: sql`excluded.style`,
        options: sql`excluded.options`,
        art: sql`excluded.art`,
        updated_at: new Date(),
      },
    });
  console.log(
    `  faces: ${seededFaces.length} accents, ${avatarRows.length} Altvatars upserted`
  );
  await db
    .insert(profile_members)
    .values([
      // Every self membership at the fully protected default — an absent tier
      // row resolves to `surprise`, the state every existing account resolves
      // to and the one the viewer's own lists render at in local mode.
      ...profiledUsers.map((u) => ({
        user_id: u.id,
        profile_id: selfProfileOf(u.id),
        role: ROLES.self.value,
        last_active_at: LAST_ACTIVE_AT[selfProfileOf(u.id)] ?? null,
      })),
      // The one seat carrying a raised baseline (written below as a
      // `profile_preferences` tier row), so both projections are reachable in
      // local mode by switching profiles rather than by writing.
      {
        user_id: VIEWER_ID,
        profile_id: OWNED_PROFILE_ID,
        role: ROLES.owner.value,
        last_active_at: LAST_ACTIVE_AT[OWNED_PROFILE_ID] ?? null,
      },
      {
        user_id: friendId('alice'),
        profile_id: OWNED_PROFILE_ID,
        role: ROLES.manager.value,
        last_active_at: null,
      },
      // The viewer as `manager`, never acted as: the third role, and the NULL
      // that orders after every membership carrying a value.
      {
        user_id: VIEWER_ID,
        profile_id: MANAGED_PROFILE_ID,
        role: ROLES.manager.value,
        last_active_at: null,
      },
      {
        user_id: friendId('bob'),
        profile_id: MANAGED_PROFILE_ID,
        role: ROLES.owner.value,
        last_active_at: null,
      },
      // The manager seat e2e writes on, kept apart from the two fixtures
      // MANAGED_PROFILE_ID carries.
      {
        user_id: VIEWER_ID,
        profile_id: WORKSHOP_PROFILE_ID,
        role: ROLES.manager.value,
        last_active_at: LAST_ACTIVE_AT[WORKSHOP_PROFILE_ID] ?? null,
      },
      {
        user_id: friendId('bob'),
        profile_id: WORKSHOP_PROFILE_ID,
        role: ROLES.owner.value,
        last_active_at: null,
      },
      // The claim-visibility seat: the viewer is the member whose baseline an
      // owner writes. No tier row is seeded, so both members resolve to the
      // fully protected `surprise` — where the flow's first assertion starts.
      {
        user_id: VIEWER_ID,
        profile_id: VISIBILITY_PROFILE_ID,
        role: ROLES.manager.value,
        last_active_at: null,
      },
      {
        user_id: friendId('bob'),
        profile_id: VISIBILITY_PROFILE_ID,
        role: ROLES.owner.value,
        last_active_at: null,
      },
    ])
    .onConflictDoNothing();
  console.log(
    `  preferences: 2 catalog rows inserted-if-absent\n  profiles: ${profiledUsers.length} self + 4 managed inserted-if-absent, profile_members: ${profiledUsers.length + 8} inserted-if-absent (existing rows keep their current values)`
  );

  // Member baseline tiers: account-keyed rows on the identity seat. Upserted so
  // a re-run after editing MEMBER_SPOILER_TIERS repaints the value. Targets the
  // partial member index (WHERE user_id IS NOT NULL), matching writeMemberTier.
  await db
    .insert(profile_preferences)
    .values(
      MEMBER_SPOILER_TIERS.map((m) => ({
        profile_id: m.profile_id,
        user_id: m.user_id,
        preference_id: SPOILER_TIER_PREFERENCE_ID,
        value: m.tier,
      }))
    )
    .onConflictDoUpdate({
      target: [
        profile_preferences.profile_id,
        profile_preferences.user_id,
        profile_preferences.preference_id,
      ],
      targetWhere: isNotNull(profile_preferences.user_id),
      set: { value: sql`excluded.value` },
    });
  console.log(
    `  profile_preferences: ${MEMBER_SPOILER_TIERS.length} member spoiler tiers upserted`
  );

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
          profile_id: listProfileOf(l),
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
    profile_id: string;
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
      // The claim-visibility seat's first item is pinned to a single claim so
      // its seeded claim fills it: what a raised baseline discloses on a
      // non-owner's card is the fully-claimed treatment, and the rotation
      // would otherwise decide that per run position.
      if (list.id === 'dev-list-visibility-wishlist' && idx === 0) {
        quantity_limit = 1;
      }
      // Every third item on every fourth list seeds imageless so the lazy
      // placeholder-mint path (empty container -> generated art on first view)
      // is reachable straight from the seed.
      const imageless = listIdx % 4 === 3 && idx % 3 === 0;
      itemRows.push({
        id: itemId,
        name,
        description: descriptionFor(itemId),
        profile_id: listProfileOf(list),
        image_url: imageless
          ? ''
          : `https://picsum.photos/seed/${itemId}/400/400`,
        archived_at: archive
          ? new Date(ARCHIVE_EPOCH - (h % 30) * 86400000)
          : null,
        quantity_limit,
      });
      listItemRows.push({ list_id: list.id, item_id: itemId, position: idx });
    });
  });
  const linklessPricedByItem = appendLinklessExtras(itemRows, listItemRows);
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
  // Hand-authored non-link states (non-link-item-states): one PRICED item
  // (a single linkless priced row) and one BARE item (zero store rows), so
  // both first-class states are reachable straight from the seed.
  const PRICED_ITEM = 'dev-list-viewer-birthday-item-5';
  const BARE_ITEM = 'dev-list-viewer-birthday-item-7';
  const PRICED_ROWS = [{ name: '', link: '', price: '24.99' }];
  const storeRows: {
    id: string;
    item_id: string;
    name: string;
    link: string;
    price: string;
    order: number;
  }[] = [];
  // Store rows for one item, or null for none: BARE items and BARE linkless
  // extras get zero rows, PRICED linkless items a single linkless priced row,
  // hand-authored specials their fixed rows, everything else 1–3 catalog
  // stores deterministic by item id hash.
  const catalogFor = (
    itemId: string
  ): { name: string; link: string; price: string }[] | null => {
    if (itemId === BARE_ITEM) return null;
    const linklessPrice = linklessPricedByItem.get(itemId);
    if (linklessPrice !== undefined)
      return [{ name: '', link: '', price: linklessPrice }];
    if (itemId.includes('-linkless-')) return null;
    if (itemId === LONG_STORE_ITEM) return LONG_STORE_ROWS;
    if (itemId === PRICED_ITEM) return PRICED_ROWS;
    const hash = itemId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from(
      { length: (hash % 3) + 1 },
      (_, i) => STORE_CATALOG[(hash + i) % STORE_CATALOG.length]
    );
  };
  for (const item of itemRows) {
    const catalog = catalogFor(item.id);
    if (!catalog) continue;
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

  // Active-image rows + candidate pools. The active pointer now lives in
  // item_images.active, not items.image_url, so every item gets one active row
  // mirroring its seeded image_url. A couple of fetched-style items get extra
  // non-active alt candidates so the picker grid / pagination states are
  // reachable straight from the seed; the rest keep a single-image pool so the
  // no-grid state is also covered. Re-runs are idempotent via delete-then-insert
  // (serial ids — nothing stable to upsert on).
  const POOL_SIZE: Record<string, number> = {
    'dev-list-viewer-birthday-item-1': 4,
    'dev-list-alice-baby-item-2': 3,
  };
  const imageRows = itemRows.flatMap((item) => {
    if (!item.image_url) return []; // imageless items mint art on first view
    const main = { item_id: item.id, url: item.image_url, active: true };
    const altCount = (POOL_SIZE[item.id] ?? 1) - 1;
    const alts = Array.from({ length: altCount }, (_, i) => ({
      item_id: item.id,
      url: `https://picsum.photos/seed/${item.id}-alt-${i + 1}/400/400`,
      active: false,
    }));
    return [main, ...alts];
  });
  const seededItemIds = itemRows.map((item) => item.id);
  await db
    .delete(item_images)
    .where(inArray(item_images.item_id, seededItemIds));
  await db.insert(item_images).values(imageRows);
  console.log(`  item_images: ${imageRows.length} inserted`);

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
    profile_id: string | null;
    claimed_by_profile_id: string | null;
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
      profile_id: selfProfileOf(friendId('bob')),
      claimed_by_profile_id: selfProfileOf(friendId('alice')),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      // The viewer as attributed purchaser on a friend's list: Bob marked the
      // viewer. The viewer sees it as their own claim ('self') and can unclaim.
      id: 'dev-purchase-attributed-to-viewer',
      item_id: 'dev-list-alice-wedding-item-1',
      profile_id: selfProfileOf(VIEWER_ID),
      claimed_by_profile_id: selfProfileOf(friendId('bob')),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      // Owner self-claim (unlimited item): claimer and purchaser are both the
      // owner — the spoiler-view "I bought this myself" state.
      id: 'dev-purchase-owner-self',
      item_id: 'dev-list-viewer-birthday-item-2',
      profile_id: selfProfileOf(VIEWER_ID),
      claimed_by_profile_id: selfProfileOf(VIEWER_ID),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    // The owned profile's list is the seat whose baseline is `identity`, so it
    // carries one claim of each shape the levels render differently: another
    // party's, the viewer's own, and one recorded on someone's behalf.
    {
      id: 'dev-purchase-owned-other',
      item_id: 'dev-list-owned-wishlist-item-1',
      profile_id: selfProfileOf(friendId('alice')),
      claimed_by_profile_id: selfProfileOf(friendId('alice')),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      id: 'dev-purchase-owned-mine',
      item_id: 'dev-list-owned-wishlist-item-2',
      profile_id: selfProfileOf(VIEWER_ID),
      claimed_by_profile_id: selfProfileOf(VIEWER_ID),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      // Proxy-recorded, so the recorder is namable at `identity` and at no
      // level below it.
      id: 'dev-purchase-owned-proxy',
      item_id: 'dev-list-owned-wishlist-item-3',
      profile_id: selfProfileOf(friendId('bob')),
      claimed_by_profile_id: selfProfileOf(friendId('alice')),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      // Visibility Profile's list carries one deterministic claim so the
      // owner-sets-a-member's-baseline e2e flow has something whose disclosure
      // flips with the baseline, rather than depending on the fan-out.
      id: 'dev-purchase-visibility-other',
      item_id: 'dev-list-visibility-wishlist-item-1',
      profile_id: selfProfileOf(friendId('alice')),
      claimed_by_profile_id: selfProfileOf(friendId('alice')),
      guest_name: null,
      purchased_at: ATTRIBUTION_EPOCH,
    },
    {
      // Legacy-shape signed-out guest row (all-NULL identities): self-serve
      // removal is the exact-name match; the owner escape hatch is master
      // unclaim.
      id: 'dev-purchase-legacy-guest',
      item_id: 'dev-list-viewer-birthday-item-3',
      profile_id: null,
      claimed_by_profile_id: null,
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

      const purchaseCount = purchaseCountFor(
        item,
        list.user_id,
        listIdx,
        idx,
        purchaseRatio
      );
      if (purchaseCount === 0) return;

      // Eligible buyer pool (owner excluded). Rotate by (h + n) so each
      // multi-buyer item picks distinct buyers across its purchase rows.
      const pool =
        list.user_id === VIEWER_ID
          ? friendIds
          : [VIEWER_ID, ...friendIds].filter((id) => id !== list.user_id);

      for (let n = 1; n <= purchaseCount; n++) {
        const h = hash(`${itemId}-${n}`);
        const asGuest = h % 8 === 0;
        const buyerId = pool[(h + n) % pool.length];
        purchaseRows.push({
          id: `${itemId}-purchase-${n}`,
          item_id: itemId,
          profile_id: asGuest ? null : selfProfileOf(buyerId),
          // Self-claim shape: the buyer asserted their own claim. Guest rows
          // keep the signed-out shape (all-NULL identities).
          claimed_by_profile_id: asGuest ? null : selfProfileOf(buyerId),
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
          profile_id: sql`excluded.profile_id`,
          claimed_by_profile_id: sql`excluded.claimed_by_profile_id`,
          guest_name: sql`excluded.guest_name`,
          purchased_at: sql`excluded.purchased_at`,
        },
      });
  }
  console.log(`  purchases: ${purchaseRows.length} upserted`);

  await db
    .insert(user_follows)
    .values(
      seedFollows.map((f) => ({
        follower_id: f.follower_id,
        followee_profile_id: selfProfileOf(f.followee_id),
      }))
    )
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
