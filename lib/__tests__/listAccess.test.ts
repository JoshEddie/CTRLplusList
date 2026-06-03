import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  items,
  list_items,
  lists,
  user_blocks,
  user_follows,
  users,
} from '@/db/schema';
import { bootPglite } from '../../test/helpers/db';

// Holder mutated in `beforeAll` after pglite boots. Static imports of `@/db`
// from production source (lib/listAccess.ts, lib/dal.ts) read through the
// getter so they see the same pglite-backed drizzle client this test seeds.
const dbHolder = vi.hoisted(() => ({
  current: null as unknown as Awaited<ReturnType<typeof bootPglite>>['db'],
}));

vi.mock('@/db', () => ({
  get db() {
    return dbHolder.current;
  },
}));

vi.mock('next/cache', () => ({
  cacheTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

// Real Next `redirect()` throws a sentinel to abort rendering; production
// code relies on that — anything after a redirect call is unreachable. The
// mock mirrors this by throwing a tagged error the tests can catch via
// `rejects.toThrow`.
class RedirectSignal extends Error {
  constructor(public target: string) {
    super(`__redirect:${target}__`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new RedirectSignal(target);
  }),
}));

// Import production source AFTER vi.mock hoisting takes effect.
const { redirect } = await import('next/navigation');
const { guardListViewable, isItemViewable } = await import('../listAccess');

// Canonical IDs. The seeded foundation entities are mirrored here so the
// tests don't depend on running the prod seed script; pglite gets a fresh
// schema and we insert the rows needed for every viewability axis.
const VIEWER = 'dev-test-viewer';
const ALICE = 'dev-friend-alice'; // mutual follow with viewer
const DAVE = 'dev-friend-dave'; // not followed; owns the OWNER list
const JACK = 'dev-friend-jack'; // not followed; owns the LINK list
const CAROL = 'dev-friend-carol'; // not followed; will block viewer in setup

const LIST_DAVE_OWNER = 'list-dave-owner';
const LIST_JACK_LINK = 'list-jack-link';
const LIST_ALICE_FOLLOWERS = 'list-alice-followers';
const LIST_CAROL_FOLLOWERS = 'list-carol-followers';
const LIST_VIEWER_OWNER = 'list-viewer-owner';

const ITEM_ON_DAVE_OWNER = 'item-on-dave-owner';
const ITEM_ON_JACK_LINK = 'item-on-jack-link';
const ITEM_ON_ALICE_FOLLOWERS = 'item-on-alice-followers';
const ITEM_ON_CAROL_FOLLOWERS = 'item-on-carol-followers';
const ITEM_ON_VIEWER_OWNER = 'item-on-viewer-owner';
// Item membership of multiple lists: present on Dave's OWNER list (no access)
// AND on Alice's FOLLOWERS list (access via mutual follow). Owned by Dave.
const ITEM_MULTI_LIST = 'item-on-two-lists';
// Item not on any list, owned by Dave.
const ITEM_NO_LISTS = 'item-with-no-list-membership';
// Item owned by Dave but added to the VIEWER's own private list. Exercises the
// in-loop `list.user_id === viewerId` branch of `isListViewableForViewer`:
// outer `viewerId === item.user_id` short-circuit does NOT fire (Dave owns it),
// so the loop runs; first iteration (Dave's OWNER list) returns false, second
// iteration (viewer's own list) returns true via the list-owner branch.
const ITEM_ON_VIEWERS_LIST_OTHER_OWNER = 'item-on-viewers-list-other-owner';

beforeAll(async () => {
  const { db } = await bootPglite();
  dbHolder.current = db;

  await db.insert(users).values([
    { id: VIEWER, name: 'Viewer' },
    { id: ALICE, name: 'Alice' },
    { id: DAVE, name: 'Dave' },
    { id: JACK, name: 'Jack' },
    { id: CAROL, name: 'Carol' },
  ]);

  await db.insert(user_follows).values([
    { follower_id: VIEWER, followee_id: ALICE },
    { follower_id: ALICE, followee_id: VIEWER },
  ]);

  // Carol blocks viewer — used by §3.4 and §3.15.
  await db.insert(user_blocks).values([
    { blocker_id: CAROL, blocked_id: VIEWER },
  ]);

  await db.insert(lists).values([
    {
      id: LIST_DAVE_OWNER,
      name: "Dave's private",
      occasion: 'Just Because',
      user_id: DAVE,
      visibility: 'private',
    },
    {
      id: LIST_JACK_LINK,
      name: "Jack's unlisted",
      occasion: 'Just Because',
      user_id: JACK,
      visibility: 'unlisted',
    },
    {
      id: LIST_ALICE_FOLLOWERS,
      name: "Alice's followers",
      occasion: 'Wedding',
      user_id: ALICE,
      visibility: 'public',
    },
    {
      id: LIST_CAROL_FOLLOWERS,
      name: "Carol's followers",
      occasion: 'Graduation',
      user_id: CAROL,
      visibility: 'public',
    },
    {
      id: LIST_VIEWER_OWNER,
      name: "Viewer's private",
      occasion: 'Just Because',
      user_id: VIEWER,
      visibility: 'private',
    },
  ]);

  await db.insert(items).values([
    { id: ITEM_ON_DAVE_OWNER, name: 'D', user_id: DAVE },
    { id: ITEM_ON_JACK_LINK, name: 'J', user_id: JACK },
    { id: ITEM_ON_ALICE_FOLLOWERS, name: 'A', user_id: ALICE },
    { id: ITEM_ON_CAROL_FOLLOWERS, name: 'C', user_id: CAROL },
    { id: ITEM_ON_VIEWER_OWNER, name: 'V', user_id: VIEWER },
    { id: ITEM_MULTI_LIST, name: 'M', user_id: DAVE },
    { id: ITEM_NO_LISTS, name: 'N', user_id: DAVE },
    { id: ITEM_ON_VIEWERS_LIST_OTHER_OWNER, name: 'O', user_id: DAVE },
  ]);

  await db.insert(list_items).values([
    { list_id: LIST_DAVE_OWNER, item_id: ITEM_ON_DAVE_OWNER, position: 0 },
    { list_id: LIST_JACK_LINK, item_id: ITEM_ON_JACK_LINK, position: 0 },
    {
      list_id: LIST_ALICE_FOLLOWERS,
      item_id: ITEM_ON_ALICE_FOLLOWERS,
      position: 0,
    },
    {
      list_id: LIST_CAROL_FOLLOWERS,
      item_id: ITEM_ON_CAROL_FOLLOWERS,
      position: 0,
    },
    { list_id: LIST_VIEWER_OWNER, item_id: ITEM_ON_VIEWER_OWNER, position: 0 },
    // ITEM_MULTI_LIST is on Dave's OWNER list (no access) AND Alice's FOLLOWERS
    // list (access via mutual follow). Order matters for the loop-continue
    // branch: insert OWNER first so the function exercises a non-satisfying
    // iteration before the satisfying one.
    { list_id: LIST_DAVE_OWNER, item_id: ITEM_MULTI_LIST, position: 1 },
    { list_id: LIST_ALICE_FOLLOWERS, item_id: ITEM_MULTI_LIST, position: 1 },
    // ITEM_ON_VIEWERS_LIST_OTHER_OWNER on Dave's OWNER list (no access) AND
    // viewer's own private list (access via in-loop list-owner branch).
    // OWNER first so the loop runs a non-satisfying iteration before the
    // satisfying one — mirrors the ITEM_MULTI_LIST ordering rationale.
    {
      list_id: LIST_DAVE_OWNER,
      item_id: ITEM_ON_VIEWERS_LIST_OTHER_OWNER,
      position: 2,
    },
    {
      list_id: LIST_VIEWER_OWNER,
      item_id: ITEM_ON_VIEWERS_LIST_OTHER_OWNER,
      position: 1,
    },
  ]);
});

beforeEach(() => {
  vi.mocked(redirect).mockClear();
});

describe('listAccess', () => {
  describe('guardListViewable', () => {
    it('NullListAuthedViewer_RedirectsToLists', async () => {
      await expect(guardListViewable(null, VIEWER)).rejects.toThrow(
        /__redirect:\/lists__/
      );
      expect(redirect).toHaveBeenCalledWith('/lists');
    });

    it('NullListAnonymousViewer_RedirectsToRoot', async () => {
      await expect(guardListViewable(null, null)).rejects.toThrow(
        /__redirect:\/__/
      );
      expect(redirect).toHaveBeenCalledWith('/');
    });

    it('OwnerBlockedViewer_RedirectsToLists', async () => {
      const list = { user_id: CAROL };
      await expect(guardListViewable(list, VIEWER)).rejects.toThrow(
        /__redirect:\/lists__/
      );
      expect(redirect).toHaveBeenCalledWith('/lists');
    });

    it('AuthedViewerNotBlocked_ReturnsListVerbatim', async () => {
      const list = { user_id: DAVE };
      const result = await guardListViewable(list, VIEWER);
      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBe(list);
    });

    it('AnonymousViewer_ReturnsListVerbatimSkippingBlockCheck', async () => {
      const list = { user_id: CAROL };
      const result = await guardListViewable(list, null);
      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBe(list);
    });
  });

  describe('isItemViewable', () => {
    it('PrivateListOtherOwnerAuthedViewer_ReturnsFalse', async () => {
      expect(await isItemViewable(ITEM_ON_DAVE_OWNER, VIEWER)).toBe(false);
    });

    it('ViewerOwnsItemOnPrivateList_ReturnsTrueViaItemOwnerShortCircuit', async () => {
      expect(await isItemViewable(ITEM_ON_VIEWER_OWNER, VIEWER)).toBe(true);
    });

    it('ItemOwnerEqualsViewer_ReturnsTrueViaItemOwnerShortCircuit', async () => {
      expect(await isItemViewable(ITEM_ON_DAVE_OWNER, DAVE)).toBe(true);
    });

    it('UnlistedLinkListAnonymousViewer_ReturnsTrue', async () => {
      expect(await isItemViewable(ITEM_ON_JACK_LINK, null)).toBe(true);
    });

    it('UnlistedLinkListAuthedViewer_ReturnsTrue', async () => {
      expect(await isItemViewable(ITEM_ON_JACK_LINK, VIEWER)).toBe(true);
    });

    it('PublicListAuthedViewer_ReturnsTrue', async () => {
      expect(await isItemViewable(ITEM_ON_ALICE_FOLLOWERS, VIEWER)).toBe(true);
    });

    it('PublicListAnonymousViewer_ReturnsTrue', async () => {
      expect(await isItemViewable(ITEM_ON_ALICE_FOLLOWERS, null)).toBe(true);
    });

    it('OwnerBlockedViewer_ReturnsFalse', async () => {
      expect(await isItemViewable(ITEM_ON_CAROL_FOLLOWERS, VIEWER)).toBe(false);
    });

    it('ItemOnPrivateAndFollowersListsViewerFollowsSecondOwner_ReturnsTrue', async () => {
      expect(await isItemViewable(ITEM_MULTI_LIST, VIEWER)).toBe(true);
    });

    it('ItemOwnedByOtherOnViewersOwnList_ReturnsTrueViaLoopOwnerBranch', async () => {
      expect(
        await isItemViewable(ITEM_ON_VIEWERS_LIST_OTHER_OWNER, VIEWER)
      ).toBe(true);
    });

    it('ItemNoListMembershipOwnerIsViewer_ReturnsTrue', async () => {
      expect(await isItemViewable(ITEM_NO_LISTS, DAVE)).toBe(true);
    });

    it('ItemNoListMembershipAnonymousViewer_ReturnsFalse', async () => {
      expect(await isItemViewable(ITEM_NO_LISTS, null)).toBe(false);
    });

    it('NonExistentItemId_ReturnsFalse', async () => {
      expect(
        await isItemViewable('00000000-does-not-exist', VIEWER)
      ).toBe(false);
    });
  });
});
