import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { item_images } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import {
  seedItem,
  seedItemImages,
  seedList,
  seedListItem,
  type TestDb,
} from './test-helpers';

mockNextCache();

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

// Booting a fresh pglite (full migration set) per test is the dominant per-test
// cost; doing it for every case turns the full parallel-fork suite into a boot
// storm that starves hooks and flakes unrelated tests. Instead boot once per
// file (beforeAll) and TRUNCATE + reseed between tests (beforeEach) — the same
// per-test isolation the design requires, without the storm. The generous hook
// timeout still covers the single boot under contention.
vi.setConfig({ hookTimeout: 60000 });

const OWNER = { id: 'owner', email: 'owner@test.local' };
const OTHER = { id: 'other', email: 'other@test.local' };

let db: TestDb;
let actions: typeof import('@/lib/data/item.placeholder.actions');
let updateTag: ReturnType<typeof vi.fn>;

function asOwner() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OWNER.email } } as never);
}
function asOther() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OTHER.email } } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

const imageRows = (itemId: string) =>
  db
    .select()
    .from(item_images)
    .where(eq(item_images.item_id, itemId))
    .orderBy(item_images.id);

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/item.placeholder.actions');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [OWNER, OTHER]);
  updateTag.mockClear();
  asOwner();
});

describe('mintItemPlaceholder', () => {
  const seedViewableImagelessItem = async (visibility = 'public') => {
    await seedItem(db, { id: 'IMG', user_id: OWNER.id });
    await seedList(db, { id: 'PL', user_id: OWNER.id, visibility });
    await seedListItem(db, { list_id: 'PL', item_id: 'IMG', position: 1 });
  };

  it('GuestOnPublicListItem_MintsActivePlaceholderRow-BumpsItemsTag', async () => {
    await seedViewableImagelessItem();
    noSession();

    const res = await actions.mintItemPlaceholder('IMG');

    expect(res.success).toBe(true);
    const rows = await imageRows('IMG');
    expect(rows).toHaveLength(1);
    expect(rows[0].active).toBe(true);
    expect(rows[0].url).toBe(res.url);
    expect(rows[0].url.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(updateTag).toHaveBeenCalledWith('items');
  });

  it('SameItemMintedTwice_SecondCallReturnsExistingRowWithoutInsertOrTagBump', async () => {
    await seedViewableImagelessItem();
    noSession();

    const first = await actions.mintItemPlaceholder('IMG');
    updateTag.mockClear();
    const second = await actions.mintItemPlaceholder('IMG');

    expect(second.success).toBe(true);
    expect(second.url).toBe(first.url);
    expect(await imageRows('IMG')).toHaveLength(1);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('ItemWithActiveRealImage_ReturnsItWithoutInsertOrTagBump', async () => {
    await seedViewableImagelessItem();
    await seedItemImages(db, 'IMG', ['https://img.test/a.jpg']);
    noSession();

    const res = await actions.mintItemPlaceholder('IMG');

    expect(res.success).toBe(true);
    expect(res.url).toBe('https://img.test/a.jpg');
    expect(await imageRows('IMG')).toHaveLength(1);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('RaceLoserWhoseCheckMissedTheWinner_ReturnsWinnersRowWithoutSecondActiveRow', async () => {
    await seedViewableImagelessItem();
    await seedItemImages(db, 'IMG', ['https://img.test/winner.jpg']);
    noSession();
    // Simulate the lost race: the existence check ran before the winner's
    // insert landed, so it sees nothing while the row already exists.
    vi.spyOn(db.query.item_images, 'findFirst').mockResolvedValueOnce(
      undefined as never
    );

    const res = await actions.mintItemPlaceholder('IMG');

    expect(res.success).toBe(true);
    expect(res.url).toBe('https://img.test/winner.jpg');
    const rows = await imageRows('IMG');
    expect(rows).toHaveLength(1);
    expect(rows[0].active).toBe(true);
  });

  it('RaceLoserWhoseWinnerRowVanishedBeforeReread_ReturnsItsOwnGeneratedUri', async () => {
    await seedViewableImagelessItem();
    await seedItemImages(db, 'IMG', ['https://img.test/winner.jpg']);
    noSession();
    // Both the pre-insert check and the post-conflict re-read miss the winner
    // (e.g. the row was replaced between round-trips); the action still
    // resolves with the URI it generated rather than failing.
    vi.spyOn(db.query.item_images, 'findFirst').mockResolvedValue(
      undefined as never
    );

    const res = await actions.mintItemPlaceholder('IMG');

    expect(res.success).toBe(true);
    expect(res.url!.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });

  it('GuestOnPrivateListItem_ReturnsUnauthorized-NoRowNoTagBump', async () => {
    await seedViewableImagelessItem('private');
    noSession();

    const res = await actions.mintItemPlaceholder('IMG');

    expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(await imageRows('IMG')).toHaveLength(0);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('NonViewerOnPrivateListItem_ReturnsUnauthorized-NoRow', async () => {
    await seedViewableImagelessItem('private');
    asOther();

    const res = await actions.mintItemPlaceholder('IMG');

    expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(await imageRows('IMG')).toHaveLength(0);
  });

  it('SessionLookupThrows_ReturnsFailureWithoutTagBump', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('boom'));

    const res = await actions.mintItemPlaceholder('IMG');

    expect(res).toMatchObject({ success: false, error: 'Failed to mint placeholder' });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe('fallbackItemPlaceholder', () => {
  const seedViewableItem = async (visibility = 'public') => {
    await seedItem(db, { id: 'IMG', user_id: OWNER.id });
    await seedList(db, { id: 'PL', user_id: OWNER.id, visibility });
    await seedListItem(db, { list_id: 'PL', item_id: 'IMG', position: 1 });
  };

  it('GuestOnPublicListItem_ReturnsDeterministicArtWithoutPersisting', async () => {
    await seedViewableItem();
    noSession();

    const first = await actions.fallbackItemPlaceholder('IMG');
    const second = await actions.fallbackItemPlaceholder('IMG');

    expect(first.success).toBe(true);
    expect(first.url?.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(second.url).toBe(first.url);
    expect(await imageRows('IMG')).toHaveLength(0);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('FallbackSeed_MatchesMintedArtForTheSameItem', async () => {
    await seedViewableItem();
    noSession();

    const fallback = await actions.fallbackItemPlaceholder('IMG');
    const minted = await actions.mintItemPlaceholder('IMG');

    expect(fallback.url).toBe(minted.url);
  });

  it('NonViewerOnPrivateListItem_ReturnsUnauthorized', async () => {
    await seedViewableItem('private');
    asOther();

    const res = await actions.fallbackItemPlaceholder('IMG');

    expect(res.success).toBe(false);
    expect(await imageRows('IMG')).toHaveLength(0);
  });

  it('SessionLookupThrows_ReturnsFailure', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('boom'));

    const res = await actions.fallbackItemPlaceholder('IMG');

    expect(res.success).toBe(false);
    expect(res.error).toBe('Failed to generate fallback');
  });
});

describe('previewPlaceholders', () => {
  it('SessionLookupThrows_ReturnsFailure', async () => {
    vi.mocked(auth).mockRejectedValue(new Error('boom'));

    const res = await actions.previewPlaceholders(2);

    expect(res).toMatchObject({ success: false, error: 'Failed to generate previews' });
  });

  it('AuthenticatedRequestForThree_ReturnsThreeDistinctUrisWithoutPersistingRows', async () => {
    const res = await actions.previewPlaceholders(3);

    expect(res.success).toBe(true);
    expect(res.urls).toHaveLength(3);
    expect(new Set(res.urls).size).toBe(3);
    for (const url of res.urls!) {
      expect(url.startsWith('data:image/svg+xml;base64,')).toBe(true);
    }
    expect(await db.select().from(item_images)).toHaveLength(0);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it('UnauthenticatedRequest_ReturnsUnauthorized', async () => {
    noSession();

    const res = await actions.previewPlaceholders(2);

    expect(res).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(res.urls).toBeUndefined();
  });

  it('OutOfRangeCount_ClampsToOneThroughFour', async () => {
    const one = await actions.previewPlaceholders(0);
    const four = await actions.previewPlaceholders(99);

    expect(one.urls).toHaveLength(1);
    expect(four.urls).toHaveLength(4);
  });
});
