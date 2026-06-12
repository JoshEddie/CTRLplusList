import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { lists } from '@/db/schema';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import { seedList, type TestDb } from './test-helpers';

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));

vi.setConfig({ hookTimeout: 60000 });

const OWNER = { id: 'owner', email: 'owner@test.local' };
const STALE = new Date('2020-01-01T00:00:00.000Z');

let db: TestDb;
let touch: typeof import('@/lib/data/list.touch');

const listRows = () => db.select().from(lists);

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  touch = await import('@/lib/data/list.touch');
});

beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [OWNER]);
  await seedList(db, { id: 'A', user_id: OWNER.id, updated_at: STALE });
  await seedList(db, { id: 'B', user_id: OWNER.id, updated_at: STALE });
  await seedList(db, { id: 'C', user_id: OWNER.id, updated_at: STALE });
});

describe('touchLists', () => {
  it('TwoIds_BumpsThoseRows-LeavesOtherUntouched', async () => {
    const before = Date.now();
    await touch.touchLists(['A', 'B']);
    const after = Date.now();

    const rows = await listRows();
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.A.updated_at.getTime()).toBeGreaterThanOrEqual(before);
    expect(byId.A.updated_at.getTime()).toBeLessThanOrEqual(after);
    expect(byId.B.updated_at.getTime()).toBeGreaterThanOrEqual(before);
    expect(byId.B.updated_at.getTime()).toBeLessThanOrEqual(after);
    expect(byId.C.updated_at.toISOString()).toBe(STALE.toISOString());
  });

  it('EmptyArray_IssuesNoQuery', async () => {
    const updateSpy = vi.spyOn(db, 'update');
    await touch.touchLists([]);
    expect(updateSpy).not.toHaveBeenCalled();
    const rows = await listRows();
    for (const row of rows) {
      expect(row.updated_at.toISOString()).toBe(STALE.toISOString());
    }
  });
});
