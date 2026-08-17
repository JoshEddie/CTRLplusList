import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { sqlstateOf } from '../../lib/sqlstate';
import { bootPglite, resetDb } from '../../test/helpers/db';
import {
  items,
  lists,
  profiles,
  purchases,
  user_blocks,
  user_follows,
  users,
} from '../schema';

let db: Awaited<ReturnType<typeof bootPglite>>['db'];

const PG_UNIQUE_VIOLATION = '23505';
const PG_NOT_NULL_VIOLATION = '23502';

async function sqlstateOfWrite(write: Promise<unknown>) {
  const error = await write.then(
    () => null,
    (e: unknown) => e
  );
  return sqlstateOf(error);
}

beforeAll(async () => {
  ({ db } = await bootPglite());
});

beforeEach(async () => {
  await resetDb(db);
  await db.insert(users).values([
    { id: 'u1', name: 'Owner' },
    { id: 'u2', name: 'Friend' },
  ]);
  await db.insert(profiles).values([
    { id: 'p1', name: 'Owner', user_id: 'u1' },
    { id: 'p2', name: 'Friend', user_id: 'u2' },
  ]);
});

describe('profileReferences', () => {
  describe('VacatedAccountColumns', () => {
    it('ListAndItemWithNullUserId_PersistWithProfileIdOnly', async () => {
      await db
        .insert(lists)
        .values({ id: 'l1', name: 'L', occasion: 'O', profile_id: 'p1' });
      await db.insert(items).values({ id: 'i1', name: 'I', profile_id: 'p1' });

      const listRows = await db
        .select({ user_id: lists.user_id, profile_id: lists.profile_id })
        .from(lists);
      const itemRows = await db
        .select({ user_id: items.user_id, profile_id: items.profile_id })
        .from(items);
      expect(listRows).toEqual([{ user_id: null, profile_id: 'p1' }]);
      expect(itemRows).toEqual([{ user_id: null, profile_id: 'p1' }]);
    });

    it('EdgeRowsWithNullAccountColumns_PersistWithVacatedColumnsNull', async () => {
      await db
        .insert(user_follows)
        .values({ follower_id: 'u1', followee_profile_id: 'p2' });
      await db
        .insert(user_blocks)
        .values({ blocker_profile_id: 'p1', blocked_profile_id: 'p2' });

      const follow = await db
        .select({ followee_id: user_follows.followee_id })
        .from(user_follows);
      const block = await db
        .select({
          blocker_id: user_blocks.blocker_id,
          blocked_id: user_blocks.blocked_id,
        })
        .from(user_blocks);
      expect(follow).toEqual([{ followee_id: null }]);
      expect(block).toEqual([{ blocker_id: null, blocked_id: null }]);
    });
  });

  describe('ProfileColumnNotNull', () => {
    it('ListWithoutProfileId_RejectsWith23502', async () => {
      expect(
        await sqlstateOfWrite(
          db.insert(lists).values({
            id: 'l1',
            name: 'L',
            occasion: 'O',
          } as typeof lists.$inferInsert)
        )
      ).toBe(PG_NOT_NULL_VIOLATION);
    });

    it('ItemWithoutProfileId_RejectsWith23502', async () => {
      expect(
        await sqlstateOfWrite(
          db
            .insert(items)
            .values({ id: 'i1', name: 'I' } as typeof items.$inferInsert)
        )
      ).toBe(PG_NOT_NULL_VIOLATION);
    });
  });

  describe('RecreatedPrimaryKeys', () => {
    it('DuplicateFollowEdge_RejectsWith23505', async () => {
      await db
        .insert(user_follows)
        .values({ follower_id: 'u1', followee_profile_id: 'p2' });
      expect(
        await sqlstateOfWrite(
          db
            .insert(user_follows)
            .values({ follower_id: 'u1', followee_profile_id: 'p2' })
        )
      ).toBe(PG_UNIQUE_VIOLATION);
    });

    it('DuplicateBlockEdge_RejectsWith23505', async () => {
      await db
        .insert(user_blocks)
        .values({ blocker_profile_id: 'p1', blocked_profile_id: 'p2' });
      expect(
        await sqlstateOfWrite(
          db
            .insert(user_blocks)
            .values({ blocker_profile_id: 'p1', blocked_profile_id: 'p2' })
        )
      ).toBe(PG_UNIQUE_VIOLATION);
    });
  });

  describe('PurchaserPartialUnique', () => {
    beforeEach(async () => {
      await db.insert(items).values({ id: 'i1', name: 'I', profile_id: 'p1' });
    });

    it('DuplicateProfilePurchaser_RejectsWith23505', async () => {
      await db
        .insert(purchases)
        .values({ id: 'pu1', item_id: 'i1', profile_id: 'p2' });
      expect(
        await sqlstateOfWrite(
          db
            .insert(purchases)
            .values({ id: 'pu2', item_id: 'i1', profile_id: 'p2' })
        )
      ).toBe(PG_UNIQUE_VIOLATION);
    });

    it('MultipleNullPurchaserGuestRows_BothPersist', async () => {
      await db.insert(purchases).values([
        { id: 'pu1', item_id: 'i1', guest_name: 'A' },
        { id: 'pu2', item_id: 'i1', guest_name: 'B' },
      ]);
      const rows = await db.select({ id: purchases.id }).from(purchases);
      expect(rows).toHaveLength(2);
    });
  });

  describe('ProfileDeleteBehavior', () => {
    beforeEach(async () => {
      await db
        .insert(lists)
        .values({ id: 'l1', name: 'L', occasion: 'O', profile_id: 'p2' });
      await db.insert(items).values({ id: 'i1', name: 'I', profile_id: 'p1' });
      await db
        .insert(user_follows)
        .values({ follower_id: 'u1', followee_profile_id: 'p2' });
      await db
        .insert(user_blocks)
        .values({ blocker_profile_id: 'p2', blocked_profile_id: 'p1' });
      await db.insert(purchases).values([
        // p2 as purchaser of the item — cascades with the profile.
        { id: 'pu-purchaser', item_id: 'i1', profile_id: 'p2' },
        // p2 as asserter only — survives with the asserter nulled.
        {
          id: 'pu-asserter',
          item_id: 'i1',
          profile_id: null,
          claimed_by_profile_id: 'p2',
          guest_name: 'Mom',
        },
      ]);

      await db.delete(profiles).where(eq(profiles.id, 'p2'));
    });

    it('OwnedContentAndEdges_Cascade', async () => {
      expect(await db.select().from(lists)).toEqual([]);
      expect(await db.select().from(user_follows)).toEqual([]);
      expect(await db.select().from(user_blocks)).toEqual([]);
      const purchaserRows = await db
        .select({ id: purchases.id })
        .from(purchases)
        .where(eq(purchases.id, 'pu-purchaser'));
      expect(purchaserRows).toEqual([]);
    });

    it('AsserterRow_SurvivesWithNullAsserter', async () => {
      const rows = await db
        .select({
          id: purchases.id,
          claimed_by_profile_id: purchases.claimed_by_profile_id,
        })
        .from(purchases);
      expect(rows).toEqual([
        { id: 'pu-asserter', claimed_by_profile_id: null },
      ]);
    });
  });
});
