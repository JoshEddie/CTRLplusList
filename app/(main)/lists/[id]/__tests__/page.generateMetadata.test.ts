import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedList } from '@/app/actions/__tests__/test-helpers';
import { lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const OWNER = { id: 'owner', email: 'owner@test.local' };
const NON_OWNER = { id: 'nonowner', email: 'nonowner@test.local' };

const GENERIC_TITLE = 'List | ctrl+list';
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
  await seedUsers(db, [OWNER, NON_OWNER]);
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

  describe('nameLeakMatrix', () => {
    it('PrivateAnon_GenericTitle-NoOgTwitter', async () => {
      await seedNamed('p', 'private', 'Secret Wishlist');
      anonymous();
      const meta = await callMeta('p');
      expect(meta.title).toBe(GENERIC_TITLE);
      expect(meta.openGraph).toBeUndefined();
      expect(meta.twitter).toBeUndefined();
    });

    it('PrivateAuthedNonOwner_GenericTitle-NoOgTwitter', async () => {
      await seedNamed('p', 'private', 'Secret Wishlist');
      asNonOwner();
      const meta = await callMeta('p');
      expect(meta.title).toBe(GENERIC_TITLE);
      expect(meta.openGraph).toBeUndefined();
      expect(meta.twitter).toBeUndefined();
    });

    it('UnlistedAuthedNonOwner_GenericTitle-NoOgTwitter', async () => {
      await seedNamed('u', 'unlisted', 'Link List');
      asNonOwner();
      const meta = await callMeta('u');
      expect(meta.title).toBe(GENERIC_TITLE);
      expect(meta.openGraph).toBeUndefined();
      expect(meta.twitter).toBeUndefined();
    });

    it('PrivateOwner_FullMetadata-StillNoindex', async () => {
      await seedNamed('p', 'private', 'Secret Wishlist');
      asOwner();
      const meta = await callMeta('p');
      expect(meta.title).toBe('Secret Wishlist');
      expect(meta.openGraph?.title).toBe('Secret Wishlist');
      expect(meta.twitter?.title).toBe('Secret Wishlist');
      expect(meta.robots).toEqual(NOINDEX);
    });

    it('UnlistedOwner_FullMetadata-StillNoindex', async () => {
      await seedNamed('u', 'unlisted', 'Link List');
      asOwner();
      const meta = await callMeta('u');
      expect(meta.title).toBe('Link List');
      expect(meta.openGraph?.title).toBe('Link List');
      expect(meta.twitter?.title).toBe('Link List');
      expect(meta.robots).toEqual(NOINDEX);
    });

    it('PublicAnon_FullMetadata', async () => {
      await seedNamed('pub', 'public', 'Shared List');
      anonymous();
      const meta = await callMeta('pub');
      expect(meta.title).toBe('Shared List');
      expect(meta.openGraph?.title).toBe('Shared List');
      expect(meta.twitter?.title).toBe('Shared List');
    });

    it('PublicAuthedNonOwner_FullMetadata', async () => {
      await seedNamed('pub', 'public', 'Shared List');
      asNonOwner();
      const meta = await callMeta('pub');
      expect(meta.title).toBe('Shared List');
      expect(meta.openGraph?.title).toBe('Shared List');
      expect(meta.twitter?.title).toBe('Shared List');
    });

    it('Public_AuthNeverConsulted', async () => {
      await seedNamed('pub', 'public', 'Shared List');
      const meta = await callMeta('pub');
      expect(meta.title).toBe('Shared List');
      // The `isShared` short-circuit must skip the session lookup entirely;
      // a regression that dropped it would over-fetch and could leak.
      expect(auth).not.toHaveBeenCalled();
    });
  });

  describe('failClosedFallbacks', () => {
    it('UnknownId_GenericTitle-Noindex-NoOgTwitter', async () => {
      const meta = await callMeta('no-such-list');
      expect(meta.title).toBe(GENERIC_TITLE);
      expect(meta.robots).toEqual(NOINDEX);
      expect(meta.openGraph).toBeUndefined();
      expect(meta.twitter).toBeUndefined();
    });

    it('GetListThrows_GenericTitle-Noindex-NoOgTwitter', async () => {
      // A row whose `visibility` string is outside the decodable set forces
      // `getList`'s `fromDb` to throw, which it re-raises — exercising the
      // `try/catch` fail-closed branch in generateMetadata.
      await seedList(db, {
        id: 'bad',
        user_id: OWNER.id,
        visibility: 'bogus-value',
        name: 'Corrupt List',
      });
      const meta = await callMeta('bad');
      expect(meta.title).toBe(GENERIC_TITLE);
      expect(meta.robots).toEqual(NOINDEX);
      expect(meta.openGraph).toBeUndefined();
      expect(meta.twitter).toBeUndefined();
    });
  });
});
