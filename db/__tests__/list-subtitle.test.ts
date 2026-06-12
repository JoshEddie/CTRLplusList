import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bootPglite, resetDb } from '../../test/helpers/db';
import { lists, users } from '../schema';

let db: Awaited<ReturnType<typeof bootPglite>>['db'];

async function seedOwner() {
  await db.insert(users).values({ id: 'u1', name: 'Owner' });
}

async function readSubtitle(id: string) {
  const rows = await db
    .select({ subtitle: lists.subtitle })
    .from(lists)
    .where(eq(lists.id, id));
  return rows[0]?.subtitle;
}

beforeAll(async () => {
  ({ db } = await bootPglite());
});

beforeEach(async () => {
  await resetDb(db);
  await seedOwner();
});

describe('subtitle', () => {
  describe('NoBackfill', () => {
    it('InsertOmittingSubtitle_ColumnIsNull', async () => {
      await db
        .insert(lists)
        .values({ id: 'l1', name: 'Christmas', occasion: 'Christmas', user_id: 'u1' });

      expect(await readSubtitle('l1')).toBeNull();
    });
  });

  describe('RoundTrip', () => {
    it('InsertWithSubtitle_RoundTripsOnSelect', async () => {
      await db.insert(lists).values({
        id: 'l1',
        name: 'Christmas',
        occasion: 'Christmas',
        user_id: 'u1',
        subtitle: 'Brandy Family',
      });

      expect(await readSubtitle('l1')).toBe('Brandy Family');
    });

    it('UpdateSubtitle_PersistsNewValue', async () => {
      await db.insert(lists).values({
        id: 'l1',
        name: 'Christmas',
        occasion: 'Christmas',
        user_id: 'u1',
        subtitle: 'Brandy Family',
      });

      await db
        .update(lists)
        .set({ subtitle: 'Josh Family' })
        .where(eq(lists.id, 'l1'));

      expect(await readSubtitle('l1')).toBe('Josh Family');
    });
  });

  describe('ClearToNull', () => {
    it('UpdateSubtitleToNull_ClearsStoredValue', async () => {
      await db.insert(lists).values({
        id: 'l1',
        name: 'Christmas',
        occasion: 'Christmas',
        user_id: 'u1',
        subtitle: 'Brandy Family',
      });

      await db.update(lists).set({ subtitle: null }).where(eq(lists.id, 'l1'));

      expect(await readSubtitle('l1')).toBeNull();
    });
  });
});
