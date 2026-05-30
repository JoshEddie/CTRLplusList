import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { bootPglite } from '../../test/helpers/db';
import { lists, users } from '../schema';

async function seedOwner(db: Awaited<ReturnType<typeof bootPglite>>['db']) {
  await db.insert(users).values({ id: 'u1', name: 'Owner' });
}

async function readSubtitle(
  db: Awaited<ReturnType<typeof bootPglite>>['db'],
  id: string
) {
  const rows = await db
    .select({ subtitle: lists.subtitle })
    .from(lists)
    .where(eq(lists.id, id));
  return rows[0]?.subtitle;
}

describe('subtitle', () => {
  describe('NoBackfill', () => {
    it('InsertOmittingSubtitle_ColumnIsNull', async () => {
      const { db } = await bootPglite();
      await seedOwner(db);
      await db
        .insert(lists)
        .values({ id: 'l1', name: 'Christmas', occasion: 'Christmas', user_id: 'u1' });

      expect(await readSubtitle(db, 'l1')).toBeNull();
    });
  });

  describe('RoundTrip', () => {
    it('InsertWithSubtitle_RoundTripsOnSelect', async () => {
      const { db } = await bootPglite();
      await seedOwner(db);
      await db.insert(lists).values({
        id: 'l1',
        name: 'Christmas',
        occasion: 'Christmas',
        user_id: 'u1',
        subtitle: 'Brandy Family',
      });

      expect(await readSubtitle(db, 'l1')).toBe('Brandy Family');
    });

    it('UpdateSubtitle_PersistsNewValue', async () => {
      const { db } = await bootPglite();
      await seedOwner(db);
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

      expect(await readSubtitle(db, 'l1')).toBe('Josh Family');
    });
  });

  describe('ClearToNull', () => {
    it('UpdateSubtitleToNull_ClearsStoredValue', async () => {
      const { db } = await bootPglite();
      await seedOwner(db);
      await db.insert(lists).values({
        id: 'l1',
        name: 'Christmas',
        occasion: 'Christmas',
        user_id: 'u1',
        subtitle: 'Brandy Family',
      });

      await db.update(lists).set({ subtitle: null }).where(eq(lists.id, 'l1'));

      expect(await readSubtitle(db, 'l1')).toBeNull();
    });
  });
});
