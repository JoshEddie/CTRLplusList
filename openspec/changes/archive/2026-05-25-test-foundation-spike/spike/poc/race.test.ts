import { describe, expect, it } from 'vitest';

import { items, lists, purchases, users } from '../../../../../db/schema';

import { bootPglite } from './setup-pglite';

const PG_UNIQUE_VIOLATION = '23505';

async function seedClaimFixture(db: Awaited<ReturnType<typeof bootPglite>>['db']) {
  await db.insert(users).values({
    id: 'u-owner',
    email: 'owner@test.local',
    name: 'Owner',
  });
  await db.insert(users).values({
    id: 'u-claimer',
    email: 'claimer@test.local',
    name: 'Claimer',
  });
  await db.insert(lists).values({
    id: 'l-1',
    user_id: 'u-owner',
    name: 'L',
    occasion: 'birthday',
    visibility: 'public',
    created_at: new Date(),
    updated_at: new Date(),
  });
  await db.insert(items).values({
    id: 'i-1',
    user_id: 'u-owner',
    name: 'Single-claim item',
    quantity_limit: 1,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

describe('PartialUniqueIndexRace', () => {
  it('ConcurrentSameUserClaim_RejectsSecondWith23505', async () => {
    const { db } = await bootPglite();
    await seedClaimFixture(db);

    const both = await Promise.allSettled([
      db.insert(purchases).values({
        id: 'p-a',
        item_id: 'i-1',
        user_id: 'u-claimer',
        purchased_at: new Date(),
      }),
      db.insert(purchases).values({
        id: 'p-b',
        item_id: 'i-1',
        user_id: 'u-claimer',
        purchased_at: new Date(),
      }),
    ]);

    const failures = both.filter((r) => r.status === 'rejected');
    const successes = both.filter((r) => r.status === 'fulfilled');
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const raw = (failures[0] as PromiseRejectedResult).reason as {
      code?: string;
      message?: string;
      cause?: { code?: string; severity?: string; constraint?: string };
    };
    const cause = raw.cause ?? {};
    // Surface the actual shape so the spike captures it for falsification.
    console.log('[spike] pglite unique-violation error shape:', {
      topLevelCode: raw.code,
      causeCode: cause.code,
      causeConstraint: cause.constraint,
      causeSeverity: cause.severity,
    });
    // Production code in app/actions/items.ts:238 reads `.code` directly from
    // the thrown error. Under Drizzle 0.45's pglite adapter, the SQLSTATE is
    // on `.cause.code`, NOT on the top-level error. This is the key fidelity
    // finding the spike must record.
    expect(cause.code ?? raw.code).toBe(PG_UNIQUE_VIOLATION);
  });

  it('TwoGuestClaims_AllowedByPartialIndex', async () => {
    const { db } = await bootPglite();
    await seedClaimFixture(db);

    // Both guest rows: partial unique index has `WHERE user_id IS NOT NULL`,
    // so it must NOT block these. (App-level quantity_limit is enforced in
    // the action, not at the DB layer.)
    await db.insert(purchases).values({
      id: 'p-g1',
      item_id: 'i-1',
      user_id: null,
      guest_name: 'Guest A',
      purchased_at: new Date(),
    });
    await db.insert(purchases).values({
      id: 'p-g2',
      item_id: 'i-1',
      user_id: null,
      guest_name: 'Guest B',
      purchased_at: new Date(),
    });

    const rows = await db.query.purchases.findMany({
      where: (p, { eq }) => eq(p.item_id, 'i-1'),
    });
    expect(rows).toHaveLength(2);
  });

  it('OnConflictDoNothing_AbsorbsDuplicate', async () => {
    const { db, client } = await bootPglite();
    await seedClaimFixture(db);

    await db.insert(purchases).values({
      id: 'p-1',
      item_id: 'i-1',
      user_id: 'u-claimer',
      purchased_at: new Date(),
    });

    // Raw SQL because Drizzle 0.45's onConflictDoNothing API requires the
    // target index; we want the literal Postgres semantics here.
    const result = await client.exec(`
      INSERT INTO purchases (id, item_id, user_id, purchased_at)
      VALUES ('p-2', 'i-1', 'u-claimer', NOW())
      ON CONFLICT (item_id, user_id) WHERE user_id IS NOT NULL DO NOTHING
      RETURNING id;
    `);

    const rows = result[0]?.rows ?? [];
    expect(rows).toHaveLength(0);

    const all = await db.query.purchases.findMany();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe('p-1');
  });
});
