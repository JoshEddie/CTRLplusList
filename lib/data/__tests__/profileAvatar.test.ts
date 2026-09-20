/**
 * Pins the avatar read shape: the customizer is the only
 * reader of the stored selections, and a profile's face is joined straight onto
 * the profile id with no account column among its sources.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedAvatar,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import { profile_avatars } from '@/db/schema';
import { eq } from 'drizzle-orm';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

const OWNER = { id: 'owner', email: 'owner@test.local' };
const PROFILE = selfProfileOf(OWNER.id);

let db: TestDb;
let avatar: typeof import('@/lib/data/profileAvatar');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  avatar = await import('@/lib/data/profileAvatar');
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [OWNER]);
});

describe('getAltvatarOptions', () => {
  it('ProfileWithStoredArt_ReturnsItsStyleAndSelections', async () => {
    await seedAvatar(db, PROFILE, { style: 'avataaars' });
    await db
      .update(profile_avatars)
      .set({ options: { seed: 's1', selections: { hair: 'bob' } } })
      .where(eq(profile_avatars.profile_id, PROFILE));

    expect(await avatar.getAltvatarOptions(PROFILE)).toEqual({
      style: 'avataaars',
      options: { seed: 's1', selections: { hair: 'bob' } },
    });
  });

  it('ProfileWithNoArtRow_ReturnsNull', async () => {
    expect(await avatar.getAltvatarOptions(PROFILE)).toBeNull();
  });

  it('AnotherProfilesArt_IsNotReturned', async () => {
    await seedAvatar(db, PROFILE, { style: 'toon-head' });
    expect(await avatar.getAltvatarOptions('some-other-profile')).toBeNull();
  });
});

describe('avatarViewOf', () => {
  it('ProfileWithArtAndAccent_ReturnsBothAlongsideTheName', () => {
    expect(
      avatar.avatarViewOf({
        name: 'Ada',
        avatar: { art: '<svg />', style: 'toon-head' },
        preferences: [{ value: 'lagoon' }],
      })
    ).toEqual({
      name: 'Ada',
      accent: 'lagoon',
      art: '<svg />',
      avatarStyle: 'toon-head',
    });
  });

  it('ProfileWithNeither_ReturnsNullsBesideTheName', () => {
    expect(avatar.avatarViewOf({ name: 'Ada' })).toEqual({
      name: 'Ada',
      accent: null,
      art: null,
      avatarStyle: null,
    });
  });

  it('NullProfile_ReturnsEmptyNameAndNulls', () => {
    expect(avatar.avatarViewOf(null)).toEqual({
      name: '',
      accent: null,
      art: null,
      avatarStyle: null,
    });
  });
});
