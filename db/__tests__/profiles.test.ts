import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootPglite, resetDb } from '../../test/helpers/db';
import { items, lists, profile_members, profiles, users } from '../schema';

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
  describe('OneSelfProfilePerUser', () => {
    beforeEach(async () => {
      await db.insert(profiles).values({ id: 'p1', name: 'Owner', user_id: 'u1' });
    });

    it('SecondProfileForSameUser_RejectsOnUniqueIndex', async () => {
      const constraint = await violatedConstraint(
        db.insert(profiles).values({ id: 'p2', name: 'Owner again', user_id: 'u1' })
      );

      expect(constraint).toBe('profiles_one_self_per_user_idx');
    });

    it('SecondManagedProfile_Inserts', async () => {
      await db.insert(profiles).values([
        { id: 'p2', name: 'Kiddo', user_id: null },
        { id: 'p3', name: 'Other kiddo', user_id: null },
      ]);

      const rows = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.name, 'Kiddo'));
      expect(rows).toHaveLength(1);
    });
  });

  describe('MembershipRoleCheck', () => {
    beforeEach(async () => {
      await db.insert(profiles).values({ id: 'p1', name: 'Kiddo', user_id: null });
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
      await db
        .insert(profiles)
        .values({ id: 'self-u1', name: 'Owner', user_id: 'u1' });
      await db
        .insert(profile_members)
        .values({ user_id: 'u1', profile_id: 'self-u1', role: 'self' });
      await db.insert(lists).values({
        id: 'l1',
        name: 'Christmas',
        occasion: 'Christmas',
        user_id: 'u2',
        updated_by_user_id: 'u1',
      });
      await db.insert(items).values({
        id: 'i1',
        name: 'Socks',
        user_id: 'u2',
        updated_by_user_id: 'u1',
      });

      await db.delete(users).where(eq(users.id, 'u1'));
    });

    it('ProfileSurvives_UserIdSetToNull', async () => {
      const rows = await db
        .select({ name: profiles.name, user_id: profiles.user_id })
        .from(profiles)
        .where(eq(profiles.id, 'self-u1'));
      expect(rows).toEqual([{ name: 'Owner', user_id: null }]);
    });

    it('Membership_Removed', async () => {
      const rows = await db.select().from(profile_members);
      expect(rows).toEqual([]);
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
    it('NewAccount_WritesSelfProfileAndSelfMembership', async () => {
      await createSelfProfile(db, { id: 'u1', name: 'Owner' });

      const profileRows = await db
        .select({ id: profiles.id, name: profiles.name, user_id: profiles.user_id })
        .from(profiles);
      const memberRows = await db
        .select({
          user_id: profile_members.user_id,
          profile_id: profile_members.profile_id,
          role: profile_members.role,
        })
        .from(profile_members);

      expect(profileRows).toEqual([
        { id: 'self-u1', name: 'Owner', user_id: 'u1' },
      ]);
      expect(memberRows).toEqual([
        { user_id: 'u1', profile_id: 'self-u1', role: 'self' },
      ]);
    });

    it('NamelessAccount_WritesUNTITLEDSentinel', async () => {
      await createSelfProfile(db, { id: 'u1', name: null });

      const rows = await db
        .select({ name: profiles.name })
        .from(profiles)
        .where(eq(profiles.id, 'self-u1'));
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
  });
});
