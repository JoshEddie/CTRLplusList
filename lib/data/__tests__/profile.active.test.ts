/**
 * Pins `active-profile` — "The active profile SHALL be a membership the viewer
 * holds, re-verified on every resolution", "The active selection SHALL persist
 * per browser…" (its no-rewrite-on-read clause), "A membership SHALL record
 * when its account last acted as its profile" (its ordering clause) — and
 * `app-frame`'s "The avatar dropdown SHALL carry the profile switcher" cap,
 * ordering and count.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockNextHeaders,
  readTestCookie,
  setTestCookie,
  clearTestCookies,
} from '@/test/helpers/next-headers';

import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import {
  seedManagedProfile,
  seedMembership,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import type { ProfileMembershipView } from '@/lib/types';

mockNextCache();
mockNextHeaders();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

const VIEWER = 'viewer';
const SELF = selfProfileOf(VIEWER);
const COOKIE = 'active_profile';

let db: TestDb;
let mod: typeof import('@/lib/data/profile.active');
let identityDal: typeof import('@/lib/data/profile');

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  mod = await import('@/lib/data/profile.active');
  identityDal = await import('@/lib/data/profile');
});

beforeEach(async () => {
  vi.restoreAllMocks();
  clearTestCookies();
  await resetDb(db);
  await seedUsers(db, [{ id: VIEWER, name: 'Test Viewer' }]);
});

function membership(
  id: string,
  overrides: Partial<ProfileMembershipView> = {}
): ProfileMembershipView {
  return {
    id,
    name: id,
    tagline: null,
    role: 'owner',
    accent: null,
    last_active_at: null,
    ...overrides,
  };
}

describe('getMembershipsForUser', () => {
  beforeEach(async () => {
    await seedManagedProfile(db, { id: 'stale', name: 'Stale' });
    await seedManagedProfile(db, { id: 'fresh', name: 'Fresh' });
    await seedManagedProfile(db, { id: 'never', name: 'Never' });
    await seedMembership(db, {
      user_id: VIEWER,
      profile_id: 'stale',
      last_active_at: new Date('2026-01-01T00:00:00Z'),
    });
    await seedMembership(db, {
      user_id: VIEWER,
      profile_id: 'fresh',
      role: 'manager',
      last_active_at: new Date('2026-06-01T00:00:00Z'),
    });
    await seedMembership(db, { user_id: VIEWER, profile_id: 'never' });
  });

  it('MixedTimestamps_OrdersMostRecentlyActedAsFirstWithNeverActedAsLast', async () => {
    const rows = await mod.getMembershipsForUser(VIEWER);
    // Never-acted-as rows order last, and tie-break on name among themselves
    // ("Never" before "Test Viewer") so the sequence is deterministic.
    expect(rows.map((row) => row.id)).toEqual([
      'fresh',
      'stale',
      'never',
      SELF,
    ]);
  });

  it('HeldMemberships_CarryRoleAndLastActedAs', async () => {
    const rows = await mod.getMembershipsForUser(VIEWER);
    expect(rows.find((row) => row.id === 'fresh')).toMatchObject({
      name: 'Fresh',
      role: 'manager',
      last_active_at: new Date('2026-06-01T00:00:00Z'),
    });
    expect(rows.find((row) => row.id === 'never')?.last_active_at).toBeNull();
  });

  it('UnheldProfile_IsAbsent', async () => {
    await seedManagedProfile(db, { id: 'someone-elses' });
    const rows = await mod.getMembershipsForUser(VIEWER);
    expect(rows.map((row) => row.id)).not.toContain('someone-elses');
  });
});

describe('resolveIdentity', () => {
  const self = membership(SELF, { role: 'self' });
  const held = membership('kiddo');

  it('SelectionNamesAHeldMembership_ResolvesItAsActive', () => {
    expect(mod.resolveIdentity(VIEWER, [self, held], 'kiddo')).toEqual({
      userId: VIEWER,
      selfProfile: self,
      activeProfile: held,
    });
  });

  // Every unhonourable cause lands on the same fallback, undistinguished.
  describe('UnhonourableSelection', () => {
    const activeFor = (selection: string | null) =>
      mod.resolveIdentity(VIEWER, [self], selection)?.activeProfile;

    it('RevokedMembership_FallsBackToSelf', () => {
      expect(activeFor('kiddo')).toBe(self);
    });

    it('ForgedId_FallsBackToSelf', () => {
      expect(activeFor('never-existed')).toBe(self);
    });

    it('DeletedProfile_FallsBackToSelf', () => {
      expect(activeFor('was-deleted')).toBe(self);
    });

    it('NothingStored_FallsBackToSelf', () => {
      expect(activeFor(null)).toBe(self);
    });
  });

  it('AccountWithNoSelfMembership_ResolvesToNull', () => {
    expect(mod.resolveIdentity(VIEWER, [held], 'kiddo')).toBeNull();
  });
});

describe('getUserIdentity', () => {
  beforeEach(async () => {
    await seedManagedProfile(db, { id: 'kiddo', name: 'Kiddo' });
    await seedMembership(db, { user_id: VIEWER, profile_id: 'kiddo' });
  });

  it('SelectionNamesAHeldMembership_ActsAsIt', async () => {
    setTestCookie(COOKIE, 'kiddo');
    const identity = await identityDal.getUserIdentity(VIEWER);
    expect(identity?.activeProfile.id).toBe('kiddo');
    expect(identity?.selfProfile.id).toBe(SELF);
  });

  it('StaleSelection_FallsBackToSelfWithoutRewritingTheStoredValue', async () => {
    setTestCookie(COOKIE, 'revoked-since');
    const identity = await identityDal.getUserIdentity(VIEWER);
    expect(identity?.activeProfile.id).toBe(SELF);
    // The read path never writes: the forged value is left exactly as stored.
    expect(readTestCookie(COOKIE)).toBe('revoked-since');
  });

  it('NoSelectionStored_ActsAsSelfAndWritesNoSelection', async () => {
    const identity = await identityDal.getUserIdentity(VIEWER);
    expect(identity?.activeProfile.id).toBe(SELF);
    expect(readTestCookie(COOKIE)).toBeUndefined();
  });
});

describe('switcherView', () => {
  const self = membership(SELF, { role: 'self', name: 'Test Viewer' });
  const kiddo = membership('kiddo', { name: 'Kiddo' });
  const nana = membership('nana', { name: 'Nana' });

  it('ActingAsSelf_OffersTheOthersAndExcludesTheActiveProfile', () => {
    const view = mod.switcherView(makeIdentity(VIEWER, self), [
      self,
      kiddo,
      nana,
    ]);
    expect(view.rows.map((row) => row.name)).toEqual(['Kiddo', 'Nana']);
    expect(view.profileCount).toBe(3);
  });

  it('ActingAsManaged_OffersTheViewersOwnRowAndExcludesTheActiveProfile', () => {
    const view = mod.switcherView(makeIdentity(VIEWER, self, kiddo), [
      self,
      kiddo,
      nana,
    ]);
    expect(view.rows.map((row) => row.id)).toEqual([SELF, 'nana']);
  });

  it('SingleProfileViewer_OffersNoRows', () => {
    const view = mod.switcherView(makeIdentity(VIEWER, self), [self]);
    expect(view.rows).toEqual([]);
    expect(view.profileCount).toBe(1);
  });

  it('TwelveProfiles_CapsAtFiveRowsAndCountsAllTwelve', () => {
    const managed = Array.from({ length: 11 }, (_, i) =>
      membership(`p${i}`, { name: `P${i}` })
    );
    const view = mod.switcherView(makeIdentity(VIEWER, self), [
      self,
      ...managed,
    ]);
    // The read arrives ordered most-recently-acted-as first, so the cap takes
    // the head of that order rather than re-sorting.
    expect(view.rows.map((row) => row.id)).toEqual([
      'p0',
      'p1',
      'p2',
      'p3',
      'p4',
    ]);
    expect(view.profileCount).toBe(12);
  });
});

describe('actingAsName', () => {
  it('SingleProfileViewer_ReturnsUndefined', async () => {
    expect(
      await mod.actingAsName(makeIdentity(VIEWER, makeProfile(SELF, 'Ada')))
    ).toBeUndefined();
  });

  it('MultiProfileViewer_ReturnsTheActiveProfilesName', async () => {
    await seedManagedProfile(db, { id: 'kiddo', name: 'Kiddo' });
    await seedMembership(db, { user_id: VIEWER, profile_id: 'kiddo' });
    expect(
      await mod.actingAsName(
        makeIdentity(
          VIEWER,
          makeProfile(SELF, 'Ada'),
          makeProfile('kiddo', 'Kiddo')
        )
      )
    ).toBe('Kiddo');
  });
});
