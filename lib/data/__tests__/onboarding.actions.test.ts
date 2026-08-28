/**
 * Pins `onboarding-gate`'s submit: what a submission mints, what it renames
 * rather than duplicates, and what a partial write leaves behind — the gate has
 * to stand after an art write that failed, and re-submitting has to succeed.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  preferences,
  profile_avatars,
  profile_members,
  profile_preferences,
  profiles,
  users,
} from '@/db/schema';
import { ACCENT_NAMES } from '@/lib/accent';
import { auth } from '@/lib/auth';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import {
  seedAccentCatalog,
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

const FRESH = { id: 'fresh', email: 'fresh@test.local', name: 'Grace' };
const EXISTING = { id: 'existing', email: 'existing@test.local' };
const EXISTING_PROFILE = selfProfileOf(EXISTING.id);
const ACCENT = ACCENT_NAMES[1];

const submission = {
  name: 'Grace Hopper',
  accent: String(ACCENT),
  altvatar: {
    style: 'avataaars',
    options: { seed: 'fixed-seed', selections: { hair: 'bob' } },
  },
};

let db: TestDb;
let completeOnboarding: typeof import('@/lib/data/onboarding.actions').completeOnboarding;
let updateTag: ReturnType<typeof vi.fn>;

function asAccount(email: string | null) {
  vi.mocked(auth).mockResolvedValue(
    email ? ({ user: { email } } as never) : (null as never)
  );
}

const profileRows = () => db.select().from(profiles);
const membershipRows = () => db.select().from(profile_members);
const avatarRows = () => db.select().from(profile_avatars);
const accentRows = () => db.select().from(profile_preferences);

// The art write has no foreign key to break, so its failure is provoked at the
// writer itself — what matters downstream is only the boolean it reports.
async function withFailingArtWrite(run: () => Promise<void>) {
  const write = await import('@/lib/data/profileAvatar.write');
  const spy = vi.spyOn(write, 'writeAltvatar').mockResolvedValue(false);
  try {
    await run();
  } finally {
    spy.mockRestore();
  }
}

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  ({ completeOnboarding } = await import('@/lib/data/onboarding.actions'));
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb(db);
  await seedAccentCatalog(db);
  await db.insert(users).values(FRESH);
  updateTag.mockClear();
  asAccount(FRESH.email);
});

describe('completeOnboarding', () => {
  describe('SignupArm', () => {
    it('AccountWithNoSelfProfile_MintsProfile-SelfMembership-Art-Accent', async () => {
      const res = await completeOnboarding(submission);
      expect(res.success).toBe(true);

      expect(await profileRows()).toEqual([
        expect.objectContaining({ id: res.id, name: 'Grace Hopper' }),
      ]);
      expect(await membershipRows()).toEqual([
        expect.objectContaining({
          user_id: FRESH.id,
          profile_id: res.id,
          role: 'self',
        }),
      ]);
      expect(await avatarRows()).toEqual([
        expect.objectContaining({ profile_id: res.id, style: 'avataaars' }),
      ]);
      expect(await accentRows()).toEqual([
        expect.objectContaining({ profile_id: res.id, value: String(ACCENT) }),
      ]);
    });

    it('Success_BumpsEveryTagTheSubmitsWritesTouched', async () => {
      const res = await completeOnboarding(submission);
      expect(updateTag.mock.calls).toEqual([
        [`profile_avatars:profile:${res.id}`],
        [`profile_preferences:profile:${res.id}`],
        [`profile_members:user:${FRESH.id}`],
        [`profiles:id:${res.id}`],
        [`profile_avatars:profile:${res.id}`],
        [`profile_preferences:profile:${res.id}`],
      ]);
    });
  });

  describe('ExistingArm', () => {
    beforeEach(async () => {
      await seedUsers(db, [EXISTING]);
      asAccount(EXISTING.email);
    });

    it('AccountHoldingASelfProfile_RenamesIt-MintsNoSecondProfile', async () => {
      const res = await completeOnboarding(submission);
      expect(res).toMatchObject({ success: true, id: EXISTING_PROFILE });

      expect(await profileRows()).toEqual([
        expect.objectContaining({
          id: EXISTING_PROFILE,
          name: 'Grace Hopper',
        }),
      ]);
      expect(
        (await membershipRows()).filter((m) => m.role === 'self')
      ).toHaveLength(1);
    });
  });

  describe('PartialWrite', () => {
    it('ArtWriteFails_ReportsFailure-LeavesTheProfileAndAccent', async () => {
      await withFailingArtWrite(async () => {
        const res = await completeOnboarding(submission);
        expect(res).toMatchObject({
          success: false,
          error: 'Failed to save Altvatar',
        });
        expect(await profileRows()).toHaveLength(1);
        expect(await avatarRows()).toHaveLength(0);
        expect(await accentRows()).toHaveLength(1);
      });
    });

    it('ResubmitAfterAFailedArtWrite_Succeeds-LeavesOneProfile', async () => {
      await withFailingArtWrite(async () => {
        await completeOnboarding(submission);
      });

      const res = await completeOnboarding(submission);
      expect(res.success).toBe(true);
      expect(await profileRows()).toHaveLength(1);
      expect(await avatarRows()).toHaveLength(1);
    });
  });

  describe('RejectedSubmission', () => {
    it('NoSession_ReturnsUnauthorized-WritesNoProfile', async () => {
      asAccount(null);
      expect(await completeOnboarding(submission)).toMatchObject({
        error: 'Unauthorized',
      });
      expect(await profileRows()).toHaveLength(0);
    });

    it('WhitespaceOnlyName_ReturnsNameFieldError-WritesNothing', async () => {
      const res = await completeOnboarding({ ...submission, name: '   ' });
      expect(res.errors?.name).toEqual(['Name is required']);
      expect(await profileRows()).toHaveLength(0);
      expect(await avatarRows()).toHaveLength(0);
    });

    it('AccentThatIsNotAPreset_ReturnsAccentFieldError-WritesNothing', async () => {
      const res = await completeOnboarding({
        ...submission,
        accent: 'octarine',
      });
      expect(res.errors?.accent).toEqual(['Choose an accent colour']);
      expect(await profileRows()).toHaveLength(0);
    });

    it('MintThrows_ReturnsFailedToCompleteOnboarding', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(db, 'with').mockImplementation(() => {
        throw new Error('boom');
      });
      expect(await completeOnboarding(submission)).toMatchObject({
        error: 'Failed to complete onboarding',
      });
    });
  });

  describe('ConcurrentSubmit', () => {
    it('LostTheSelfMembershipRace_AdoptsTheProfileTheWinnerMinted', async () => {
      // `createSelfProfile` swallows its own 23505 and reports null, so the
      // action's own re-read is what resolves the id it never saw.
      const self = await import('@/lib/data/profile.self');
      vi.spyOn(self, 'createSelfProfile').mockImplementation(async () => {
        await db.insert(profiles).values({ id: 'raced', name: 'Raced' });
        await db
          .insert(profile_members)
          .values({ user_id: FRESH.id, profile_id: 'raced', role: 'self' });
        return null;
      });

      const res = await completeOnboarding(submission);
      expect(res).toMatchObject({ success: true, id: 'raced' });
      expect(await avatarRows()).toEqual([
        expect.objectContaining({ profile_id: 'raced' }),
      ]);
    });

    it('RacedProfileVanishedBeforeTheReread_ReturnsUnauthorized', async () => {
      const self = await import('@/lib/data/profile.self');
      vi.spyOn(self, 'createSelfProfile').mockResolvedValue(null);

      expect(await completeOnboarding(submission)).toMatchObject({
        error: 'Unauthorized',
      });
      expect(await avatarRows()).toHaveLength(0);
    });
  });
});

describe('NoInteractiveTransactions', () => {
  it('NoCodePath_UsesTransactionApi', async () => {
    const txSpy = vi.fn();
    (db as unknown as { transaction: unknown }).transaction = txSpy;
    await completeOnboarding(submission);
    expect(txSpy).not.toHaveBeenCalled();
  });
});

describe('AccentCatalogMissing', () => {
  it('AccentWriteFails_StillMintsTheProfileAndItsArt', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await db.delete(preferences);

    const res = await completeOnboarding(submission);
    expect(res.success).toBe(true);
    expect(await accentRows()).toHaveLength(0);
    expect(await avatarRows()).toEqual([
      expect.objectContaining({ profile_id: res.id }),
    ]);
    expect(await profileRows()).toEqual([
      expect.objectContaining({ id: res.id, name: 'Grace Hopper' }),
    ]);
  });
});
