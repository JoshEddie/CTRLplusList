/**
 * Pins `onboarding-gate`'s latch: an account is un-onboarded when it holds no
 * self-profile, or when its self-profile carries no Altvatar art. A managed
 * profile's missing art means nothing, and an unauthenticated request never
 * meets the gate.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedAvatar,
  seedManagedProfile,
  seedMembership,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';

mockNextCache();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const VIEWER = { id: 'viewer', email: 'viewer@test.local', name: 'Ada' };
const VIEWER_PROFILE = selfProfileOf(VIEWER.id);
const FRESH = { id: 'fresh', email: 'fresh@test.local', name: 'Grace' };

let db: TestDb;
let resolveOnboarding: typeof import('@/lib/data/onboarding').resolveOnboarding;

// An account between sign-in and the gate's submit holds no profile at all, so
// it cannot come from `seedUsers` — that seeds a self membership by design.
async function seedAccountWithNoProfile(account: {
  id: string;
  email: string;
  name: string | null;
}) {
  await db.insert(users).values(account);
}

function asAccount(email: string | null) {
  vi.mocked(auth).mockResolvedValue(
    email ? ({ user: { email } } as never) : (null as never)
  );
}

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  ({ resolveOnboarding } = await import('@/lib/data/onboarding'));
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb(db);
  asAccount(VIEWER.email);
});

describe('resolveOnboarding', () => {
  describe('Unauthenticated', () => {
    it('NoSession_ReportsOnboarded', async () => {
      asAccount(null);
      expect(await resolveOnboarding()).toEqual({ onboarded: true });
    });

    it('SessionWithNoUsersRow_ReportsOnboarded', async () => {
      expect(await resolveOnboarding()).toEqual({ onboarded: true });
    });
  });

  describe('SignupArm', () => {
    beforeEach(async () => {
      await seedAccountWithNoProfile(FRESH);
      asAccount(FRESH.email);
    });

    it('AccountWithNoSelfProfile_ReportsSignupArmCarryingTheAccountName', async () => {
      expect(await resolveOnboarding()).toEqual({
        onboarded: false,
        userId: FRESH.id,
        arm: 'signup',
        name: 'Grace',
      });
    });

    it('AccountWhoseProviderGaveNoName_ReportsSignupArmWithNullName', async () => {
      await db.delete(users);
      await seedAccountWithNoProfile({ ...FRESH, name: null });
      expect(await resolveOnboarding()).toMatchObject({
        arm: 'signup',
        name: null,
      });
    });

    it('AccountHoldingOnlyAManagedProfile_StillReportsSignupArm', async () => {
      // A membership that is not `self` is not an identity, so it does not
      // settle onboarding however much art it carries.
      await seedManagedProfile(db, { id: 'kiddo' });
      await seedMembership(db, { user_id: FRESH.id, profile_id: 'kiddo' });
      await seedAvatar(db, 'kiddo');
      expect(await resolveOnboarding()).toMatchObject({ arm: 'signup' });
    });
  });

  describe('ExistingArm', () => {
    beforeEach(async () => {
      await seedUsers(db, [VIEWER]);
    });

    it('SelfProfileWithNoArt_ReportsExistingArmCarryingTheProfileName', async () => {
      expect(await resolveOnboarding()).toEqual({
        onboarded: false,
        userId: VIEWER.id,
        arm: 'existing',
        name: 'Ada',
      });
    });

    it('SelfProfileWithArt_ReportsOnboarded', async () => {
      await seedAvatar(db, VIEWER_PROFILE);
      expect(await resolveOnboarding()).toEqual({ onboarded: true });
    });

    it('ManagedProfileWithNoArtBesideAnOnboardedSelfProfile_ReportsOnboarded', async () => {
      await seedAvatar(db, VIEWER_PROFILE);
      await seedManagedProfile(db, { id: 'kiddo' });
      await seedMembership(db, { user_id: VIEWER.id, profile_id: 'kiddo' });
      expect(await resolveOnboarding()).toEqual({ onboarded: true });
    });
  });
});
