import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNextHeaders } from '@/test/helpers/next-headers';

import { seedList } from '@/lib/data/__tests__/test-helpers';
import { lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

mockNextCache();
mockNextHeaders();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const OWNER = {
  id: 'owner',
  email: 'owner@test.local',
  profile_name: 'Grace Example',
};
const NON_OWNER = { id: 'nonowner', email: 'nonowner@test.local' };
const EMOJI_OWNER = {
  id: 'emoji',
  email: 'emoji@test.local',
  profile_name: '🦊 Łukasz 李',
};

const LIST_NAME = 'Secret Wishlist';
const ACTION_LINE = 'Grace Example shared a list with you';
const NOINDEX = { index: false, follow: false };

let db: TestDb;
let generateMetadata: typeof import('@/app/(main)/lists/[id]/page').generateMetadata;

function asOwner() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OWNER.email } } as never);
}
function asNonOwner() {
  vi.mocked(auth).mockResolvedValue({
    user: { email: NON_OWNER.email },
  } as never);
}
function anonymous() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

function callMeta(id: string) {
  return generateMetadata({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({}),
  });
}

async function seedNamed(id: string, visibility: string, name: string) {
  await seedList(db, { id, user_id: OWNER.id, visibility, name });
}

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  await seedUsers(db, [OWNER, NON_OWNER, EMOJI_OWNER]);
  ({ generateMetadata } = await import('@/app/(main)/lists/[id]/page'));
});

beforeEach(async () => {
  // Boot once per file (beforeAll); clear lists per test so each seeds its
  // own fixture. Users persist.
  await db.delete(lists);
  vi.mocked(auth).mockReset();
  anonymous();
});

describe('generateMetadata', () => {
  describe('universalNoindex', () => {
    it('PrivateList_RobotsNoindex', async () => {
      await seedNamed('p', 'private', 'Secret Wishlist');
      const meta = await callMeta('p');
      expect(meta.robots).toEqual(NOINDEX);
    });

    it('UnlistedList_RobotsNoindex', async () => {
      await seedNamed('u', 'unlisted', 'Link List');
      const meta = await callMeta('u');
      expect(meta.robots).toEqual(NOINDEX);
    });

    it('PublicList_RobotsNoindex', async () => {
      await seedNamed('pub', 'public', 'Shared List');
      const meta = await callMeta('pub');
      expect(meta.robots).toEqual(NOINDEX);
    });
  });

  describe('everyListPreview', () => {
    async function expectListPreview(visibility: string, actAs: () => void) {
      await seedNamed('l', visibility, LIST_NAME);
      actAs();
      const meta = await callMeta('l');
      expect(meta.title).toBe(LIST_NAME);
      expect(meta.description).toBe(ACTION_LINE);
      expect(meta.openGraph).toEqual({
        title: LIST_NAME,
        description: ACTION_LINE,
        siteName: 'Ctrl+List',
        type: 'website',
      });
      expect(meta.twitter).toEqual({
        card: 'summary_large_image',
        title: LIST_NAME,
        description: ACTION_LINE,
      });
      expect(auth).not.toHaveBeenCalled();
    }

    describe('Shared', () => {
      it('Anonymous_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('public', anonymous));
      it('Owner_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('public', asOwner));
      it('NonOwner_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('public', asNonOwner));
    });

    describe('Private', () => {
      it('Anonymous_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('unlisted', anonymous));
      it('Owner_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('unlisted', asOwner));
      it('NonOwner_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('unlisted', asNonOwner));
    });

    describe('Hidden', () => {
      it('Anonymous_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('private', anonymous));
      it('Owner_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('private', asOwner));
      it('NonOwner_NamesListAndSharer-NoImages-NoSessionRead', () =>
        expectListPreview('private', asNonOwner));
    });
  });

  describe('undrawableNames', () => {
    it('EmojiAndNonLatin_KeptAsStored', async () => {
      const name = 'Grace 🎂 誕生日';
      await seedList(db, { id: 'e', user_id: EMOJI_OWNER.id, name });

      const meta = await callMeta('e');

      expect(meta.title).toBe(name);
      expect(meta.openGraph?.title).toBe(name);
      expect(meta.description).toBe('🦊 Łukasz 李 shared a list with you');
    });
  });

  describe('missingList', () => {
    it('UnknownId_OnlyNoindex', async () => {
      const meta = await callMeta('no-such-list');
      expect(meta).toEqual({ robots: NOINDEX });
    });

    it('GetListThrows_OnlyNoindex', async () => {
      // A row whose `visibility` string is outside the decodable set forces
      // `getList`'s `fromDb` to throw, which it re-raises.
      await seedList(db, {
        id: 'bad',
        user_id: OWNER.id,
        visibility: 'bogus-value',
        name: 'Corrupt List',
      });
      const meta = await callMeta('bad');
      expect(meta).toEqual({ robots: NOINDEX });
    });
  });
});
