import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '../../test/helpers/db';
import {
  items,
  lists,
  ACCENT_PREFERENCE_ID,
  preferences,
  profile_members,
  profile_preferences,
  profiles,
  SELF_MEMBERSHIP_PER_PROFILE_IDX,
  SELF_MEMBERSHIP_PER_USER_IDX,
  users,
} from '../schema';

// lib/auth.ts pulls in NextAuth, the Drizzle adapter and the Neon-backed db
// module at import time; only the exported account-creation handler is under
// test here, and it takes its database as an argument.
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
}));
vi.mock('next-auth/providers/google', () => ({ default: {} }));
vi.mock('@auth/drizzle-adapter', () => ({ DrizzleAdapter: () => ({}) }));
vi.mock('@/db', () => ({ db: {} }));

let db: Awaited<ReturnType<typeof bootPglite>>['db'];
let createSelfProfile: (typeof import('../../lib/auth'))['createSelfProfile'];

// Drizzle wraps the driver error in a generic "Failed query" message; the
// violated constraint's name only survives on `cause`.
async function violatedConstraint(write: Promise<unknown>) {
  const error = await write.then(
    () => null,
    (e: { cause?: { constraint?: string } }) => e
  );
  return error?.cause?.constraint;
}

beforeAll(async () => {
  ({ db } = await bootPglite());
  ({ createSelfProfile } = await import('../../lib/auth'));
});

beforeEach(async () => {
  await resetDb(db);
  await db.insert(users).values([
    { id: 'u1', name: 'Owner' },
    { id: 'u2', name: 'Editor' },
  ]);
});

describe('profiles', () => {
  describe('OneSelfMembershipEachWay', () => {
    beforeEach(async () => {
      await db
        .insert(profiles)
        .values([{ id: 'p1', name: 'Owner' }, { id: 'p2', name: 'Second' }]);
      await db
        .insert(profile_members)
        .values({ user_id: 'u1', profile_id: 'p1', role: 'self' });
    });

    it('SecondSelfMembershipForSameUser_RejectsOnUniqueIndex', async () => {
      const constraint = await violatedConstraint(
        db
          .insert(profile_members)
          .values({ user_id: 'u1', profile_id: 'p2', role: 'self' })
      );

      expect(constraint).toBe(SELF_MEMBERSHIP_PER_USER_IDX);
    });

    it('SecondAccountClaimingSameProfileAsSelf_RejectsOnUniqueIndex', async () => {
      const constraint = await violatedConstraint(
        db
          .insert(profile_members)
          .values({ user_id: 'u2', profile_id: 'p1', role: 'self' })
      );

      expect(constraint).toBe(SELF_MEMBERSHIP_PER_PROFILE_IDX);
    });

    it('NonSelfRolesOnTheSameProfile_Insert', async () => {
      await db
        .insert(profile_members)
        .values({ user_id: 'u2', profile_id: 'p1', role: 'manager' });

      const rows = await db
        .select({ role: profile_members.role })
        .from(profile_members)
        .where(eq(profile_members.user_id, 'u2'));
      expect(rows).toEqual([{ role: 'manager' }]);
    });
  });

  describe('MembershipRoleCheck', () => {
    beforeEach(async () => {
      await db.insert(profiles).values({ id: 'p1', name: 'Kiddo' });
    });

    it('RoleOutsideAllowedSet_RejectsOnCheckConstraint', async () => {
      const constraint = await violatedConstraint(
        db
          .insert(profile_members)
          .values({ user_id: 'u1', profile_id: 'p1', role: 'editor' })
      );

      expect(constraint).toBe('profile_members_role_valid');
    });

    it('RoleManager_Inserts', async () => {
      await db
        .insert(profile_members)
        .values({ user_id: 'u1', profile_id: 'p1', role: 'manager' });

      const rows = await db
        .select({ role: profile_members.role })
        .from(profile_members)
        .where(eq(profile_members.profile_id, 'p1'));
      expect(rows).toEqual([{ role: 'manager' }]);
    });
  });

  describe('UserDeleted', () => {
    beforeEach(async () => {
      await db.insert(profiles).values([
        { id: 'self-u1', name: 'Owner' },
        { id: 'self-u2', name: 'Editor' },
      ]);
      await db.insert(profile_members).values([
        { user_id: 'u1', profile_id: 'self-u1', role: 'self' },
        { user_id: 'u2', profile_id: 'self-u2', role: 'self' },
      ]);
      await db.insert(lists).values({
        id: 'l1',
        name: 'Christmas',
        occasion: 'Christmas',
        profile_id: 'self-u2',
        updated_by_user_id: 'u1',
      });
      await db.insert(items).values({
        id: 'i1',
        name: 'Socks',
        profile_id: 'self-u2',
        updated_by_user_id: 'u1',
      });

      await db.delete(users).where(eq(users.id, 'u1'));
    });

    it('ProfileSurvives_Detached', async () => {
      const rows = await db
        .select({ name: profiles.name })
        .from(profiles)
        .where(eq(profiles.id, 'self-u1'));
      expect(rows).toEqual([{ name: 'Owner' }]);
    });

    it('SelfMembership_RemovedLeavingTheOtherAccountsIntact', async () => {
      const rows = await db
        .select({ user_id: profile_members.user_id })
        .from(profile_members);
      expect(rows).toEqual([{ user_id: 'u2' }]);
    });

    it('AuditColumns_SetToNullOnItemsAndLists', async () => {
      const listRows = await db
        .select({ updated_by: lists.updated_by_user_id })
        .from(lists)
        .where(eq(lists.id, 'l1'));
      const itemRows = await db
        .select({ updated_by: items.updated_by_user_id })
        .from(items)
        .where(eq(items.id, 'i1'));

      expect(listRows).toEqual([{ updated_by: null }]);
      expect(itemRows).toEqual([{ updated_by: null }]);
    });
  });

  describe('createSelfProfile', () => {
    it('NewAccount_WritesNanoidSelfProfileAndSelfMembership', async () => {
      await createSelfProfile(db, { id: 'u1', name: 'Owner' });

      const profileRows = await db
        .select({ id: profiles.id, name: profiles.name })
        .from(profiles);
      const memberRows = await db
        .select({
          user_id: profile_members.user_id,
          profile_id: profile_members.profile_id,
          role: profile_members.role,
        })
        .from(profile_members);

      expect(profileRows).toHaveLength(1);
      expect(profileRows[0].name).toBe('Owner');
      expect(profileRows[0].id).toMatch(/^[A-Za-z0-9_-]{21}$/);
      expect(memberRows).toEqual([
        { user_id: 'u1', profile_id: profileRows[0].id, role: 'self' },
      ]);
    });

    it('NamelessAccount_WritesUNTITLEDSentinel', async () => {
      await createSelfProfile(db, { id: 'u1', name: null });

      const rows = await db.select({ name: profiles.name }).from(profiles);
      expect(rows).toEqual([{ name: 'UNTITLED' }]);
    });

    it('SecondRunForSameAccount_AddsNothing', async () => {
      await createSelfProfile(db, { id: 'u1', name: 'Owner' });

      await createSelfProfile(db, { id: 'u1', name: 'Renamed' });

      const profileRows = await db
        .select({ name: profiles.name })
        .from(profiles);
      const memberRows = await db.select().from(profile_members);
      expect(profileRows).toEqual([{ name: 'Owner' }]);
      expect(memberRows).toHaveLength(1);
    });

    it('LosingTheSelfMembershipRace_LeavesNoOrphanProfile', async () => {
      // The winner's rows, already committed when the loser's statement runs.
      await db.insert(profiles).values({ id: 'winner', name: 'Owner' });
      await db
        .insert(profile_members)
        .values({ user_id: 'u1', profile_id: 'winner', role: 'self' });

      await expect(
        createSelfProfile(db, { id: 'u1', name: 'Owner' })
      ).resolves.toBeUndefined();

      const profileRows = await db.select({ id: profiles.id }).from(profiles);
      const memberRows = await db.select().from(profile_members);
      expect(profileRows).toEqual([{ id: 'winner' }]);
      expect(memberRows).toHaveLength(1);
    });
  });
  // The first change to write `profile_preferences` rows is what makes these
  // cascades observable: the DDL predates it, but nothing exercised it while
  // the table shipped empty.
  describe('PreferenceValueCascades', () => {
    beforeEach(async () => {
      await db.insert(profiles).values({ id: 'p1', name: 'Kiddo' });
      await db
        .insert(preferences)
        .values({ id: ACCENT_PREFERENCE_ID, name: 'Accent color', type: 'text' });
      await db.insert(profile_preferences).values({
        profile_id: 'p1',
        preference_id: ACCENT_PREFERENCE_ID,
        value: 'rose',
      });
    });

    it('ProfileDeleted_DiscardsItsPreferenceValues', async () => {
      await db.delete(profiles).where(eq(profiles.id, 'p1'));
      expect(await db.select().from(profile_preferences)).toHaveLength(0);
    });

    it('CatalogEntryDeleted_DiscardsEveryValueReferencingIt', async () => {
      await db
        .delete(preferences)
        .where(eq(preferences.id, ACCENT_PREFERENCE_ID));
      expect(await db.select().from(profile_preferences)).toHaveLength(0);
    });
  });
});
