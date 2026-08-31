/**
 * Pins `server-endpoint-authorization` — "A profile-scoped write SHALL
 * re-verify membership on the profile it acts as" — and `active-profile`'s
 * "A membership SHALL record when its account last acted as its profile",
 * including its hourly coarsening. The gate is load-bearing twice, for
 * authorization and for the recording, so it is covered here directly rather
 * than only incidentally through the actions that call it.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNextHeaders } from '@/test/helpers/next-headers';
import { profile_members } from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import {
  seedManagedProfile,
  seedMembership,
  seedUsers,
  selfProfileOf,
} from '@/test/helpers/seedFollowGraph';
import { and, eq } from 'drizzle-orm';
import { updateTag } from 'next/cache';
import { cacheTags } from '@/lib/cacheTags';

mockNextCache();
mockNextHeaders();

type TestDb = Awaited<ReturnType<typeof bootPglite>>['db'];

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/data/user.session', () => ({
  UNAUTHORIZED_RESPONSE: {
    success: false,
    message: 'Unauthorized',
    error: 'Unauthorized',
  },
  authedIdentity: vi.fn(),
}));

const VIEWER = 'viewer';
const SELF = selfProfileOf(VIEWER);

let db: TestDb;
let gate: typeof import('@/lib/data/profile.gate');
let authedIdentity: typeof import('@/lib/data/user.session').authedIdentity;

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  gate = await import('@/lib/data/profile.gate');
  ({ authedIdentity } = await import('@/lib/data/user.session'));
});

beforeEach(async () => {
  // db is shared per-file, so restore spies first or they leak between tests.
  vi.restoreAllMocks();
  vi.clearAllMocks();
  await resetDb(db);
  await seedUsers(db, [{ id: VIEWER, name: 'Test Viewer' }]);
  await seedManagedProfile(db, { id: 'kiddo', name: 'Kiddo' });
});

const actingAs = (profileId: string) =>
  makeIdentity(
    VIEWER,
    makeProfile(SELF, 'Test Viewer'),
    makeProfile(profileId)
  );

async function lastActiveAt(profileId: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: profile_members.last_active_at })
    .from(profile_members)
    .where(
      and(
        eq(profile_members.user_id, VIEWER),
        eq(profile_members.profile_id, profileId)
      )
    );
  return row?.at ?? null;
}

describe('authedWriter', () => {
  describe('Authorization', () => {
    it('HeldMembership_ReturnsTheIdentity', async () => {
      await seedMembership(db, { user_id: VIEWER, profile_id: 'kiddo' });
      vi.mocked(authedIdentity).mockResolvedValue(actingAs('kiddo'));

      const actor = await gate.authedWriter(gate.ADMIN_OPTIONAL);

      expect(actor).toEqual({ identity: actingAs('kiddo') });
    });

    it('MembershipRevokedSinceTheFormRendered_RejectsForbiddenAndWritesNothing', async () => {
      // The identity still names Kiddo — the row behind it is gone, which is
      // exactly the case an at-write-time check exists to refuse.
      vi.mocked(authedIdentity).mockResolvedValue(actingAs('kiddo'));

      const actor = await gate.authedWriter(gate.ADMIN_OPTIONAL);

      expect(actor).toEqual({ error: gate.FORBIDDEN_RESPONSE });
      expect(gate.FORBIDDEN_RESPONSE.error).toBe('Forbidden');
      expect(await lastActiveAt('kiddo')).toBeNull();
      expect(updateTag).not.toHaveBeenCalled();
    });

    it('AnotherHeldMembership_DoesNotWidenTheCurrentRequest', async () => {
      await seedManagedProfile(db, { id: 'nana', name: 'Nana' });
      await seedMembership(db, { user_id: VIEWER, profile_id: 'nana' });
      // The account holds Nana but the request declares it acts as Kiddo, which
      // it holds no membership on.
      vi.mocked(authedIdentity).mockResolvedValue(actingAs('kiddo'));

      expect(await gate.authedWriter(gate.ADMIN_OPTIONAL)).toEqual({
        error: gate.FORBIDDEN_RESPONSE,
      });
    });

    it('UnresolvableActor_RejectsUnauthorized', async () => {
      vi.mocked(authedIdentity).mockResolvedValue(null);

      const actor = await gate.authedWriter(gate.ADMIN_OPTIONAL);

      expect(actor).toMatchObject({ error: { error: 'Unauthorized' } });
      expect(updateTag).not.toHaveBeenCalled();
    });
  });

  describe('RoleFloor', () => {
    it('ManagerOnOwnerFloor_RejectsForbiddenAndStampsNothing', async () => {
      await seedMembership(db, {
        user_id: VIEWER,
        profile_id: 'kiddo',
        role: 'manager',
      });
      vi.mocked(authedIdentity).mockResolvedValue(actingAs('kiddo'));

      const actor = await gate.authedWriter(gate.ADMIN_REQUIRED);

      expect(actor).toEqual({ error: gate.FORBIDDEN_RESPONSE });
      // The refusal lands before `stampActedAs`, so a refused write leaves no
      // trace of having been attempted.
      expect(await lastActiveAt('kiddo')).toBeNull();
    });

    it('ManagerOnMemberFloor_ReturnsTheIdentity', async () => {
      await seedMembership(db, {
        user_id: VIEWER,
        profile_id: 'kiddo',
        role: 'manager',
      });
      vi.mocked(authedIdentity).mockResolvedValue(actingAs('kiddo'));

      expect(await gate.authedWriter(gate.ADMIN_OPTIONAL)).toEqual({
        identity: actingAs('kiddo'),
      });
    });

    it.each(['AdminOptional', 'AdminRequired'] as const)(
      'OwnerOn%s_ReturnsTheIdentity',
      async (floor) => {
        const adminRequired = floor === 'AdminRequired';
        await seedMembership(db, {
          user_id: VIEWER,
          profile_id: 'kiddo',
          role: 'owner',
        });
        vi.mocked(authedIdentity).mockResolvedValue(actingAs('kiddo'));

        expect(await gate.authedWriter(adminRequired)).toEqual({
          identity: actingAs('kiddo'),
        });
      }
    );

    it.each(['AdminOptional', 'AdminRequired'] as const)(
      'SelfOn%s_ReturnsTheIdentity',
      async (floor) => {
        const adminRequired = floor === 'AdminRequired';
        vi.mocked(authedIdentity).mockResolvedValue(actingAs(SELF));

        expect(await gate.authedWriter(adminRequired)).toEqual({
          identity: actingAs(SELF),
        });
      }
    );

    it('OwnerOfAnotherProfileOnOwnerFloor_RejectsBeforeTheFloorIsConsulted', async () => {
      await seedManagedProfile(db, { id: 'nana', name: 'Nana' });
      await seedMembership(db, {
        user_id: VIEWER,
        profile_id: 'nana',
        role: 'owner',
      });
      // The role would clear the floor — on Nana. The acting-profile comparison
      // is what refuses, and it runs first.
      vi.mocked(authedIdentity).mockResolvedValue(actingAs('kiddo'));

      expect(await gate.authedWriter(gate.ADMIN_REQUIRED)).toEqual({
        error: gate.FORBIDDEN_RESPONSE,
      });
    });
  });

  describe('ActedAsRecording', () => {
    beforeEach(() => {
      vi.mocked(authedIdentity).mockResolvedValue(actingAs('kiddo'));
    });

    it('NeverActedAs_StampsTheMembership', async () => {
      await seedMembership(db, { user_id: VIEWER, profile_id: 'kiddo' });

      await gate.authedWriter(gate.ADMIN_OPTIONAL);

      expect(await lastActiveAt('kiddo')).not.toBeNull();
      expect(updateTag).toHaveBeenCalledWith(cacheTags.profilesOfUser(VIEWER));
    });

    it('StampOlderThanAnHour_Updates', async () => {
      const stale = new Date(Date.now() - 90 * 60 * 1000);
      await seedMembership(db, {
        user_id: VIEWER,
        profile_id: 'kiddo',
        last_active_at: stale,
      });

      await gate.authedWriter(gate.ADMIN_OPTIONAL);

      expect((await lastActiveAt('kiddo'))!.getTime()).toBeGreaterThan(
        stale.getTime()
      );
      expect(updateTag).toHaveBeenCalledWith(cacheTags.profilesOfUser(VIEWER));
    });

    it('StampInsideTheHour_WritesNothingAndLeavesTheRowAlone', async () => {
      const recent = new Date(Date.now() - 5 * 60 * 1000);
      await seedMembership(db, {
        user_id: VIEWER,
        profile_id: 'kiddo',
        last_active_at: recent,
      });

      await gate.authedWriter(gate.ADMIN_OPTIONAL);

      expect((await lastActiveAt('kiddo'))!.getTime()).toBe(recent.getTime());
      expect(updateTag).not.toHaveBeenCalledWith(
        cacheTags.profilesOfUser(VIEWER)
      );
    });

    it('StampWriteThrows_LogsAndLeavesTheRequestSucceeded', async () => {
      await seedMembership(db, { user_id: VIEWER, profile_id: 'kiddo' });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(db, 'update').mockImplementation(() => {
        throw new Error('boom');
      });

      // The gate itself still passes: the recording is incidental to the write
      // that triggered it, so its failure cannot fail that write.
      const actor = await gate.authedWriter(gate.ADMIN_OPTIONAL);

      expect(actor).toHaveProperty('identity');
      expect(errorSpy).toHaveBeenCalledWith(
        'Error recording acted-as:',
        expect.any(Error)
      );
      expect(updateTag).not.toHaveBeenCalledWith(
        cacheTags.profilesOfUser(VIEWER)
      );
    });

    it('BurstOfWrites_StampsOnceAcrossThem', async () => {
      await seedMembership(db, { user_id: VIEWER, profile_id: 'kiddo' });

      await gate.authedWriter(gate.ADMIN_OPTIONAL);
      const first = await lastActiveAt('kiddo');
      vi.mocked(updateTag).mockClear();

      await gate.authedWriter(gate.ADMIN_OPTIONAL);
      await gate.authedWriter(gate.ADMIN_OPTIONAL);

      expect((await lastActiveAt('kiddo'))!.getTime()).toBe(first!.getTime());
      expect(updateTag).not.toHaveBeenCalled();
    });
  });
});
