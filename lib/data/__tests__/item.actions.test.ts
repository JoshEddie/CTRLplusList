import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { item_stores, items, list_items, lists } from '@/db/schema';
import { auth } from '@/lib/auth';
import type { ItemDetails } from '@/lib/types';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedUsers } from '@/test/helpers/seedFollowGraph';

import {
  seedItem,
  seedItemStore,
  seedList,
  seedListItem,
  type TestDb,
} from './test-helpers';

mockNextCache();

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock('@/db', () => ({
  get db() {
    return holder.db;
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

// Booting a fresh pglite (full migration set) per test is the dominant per-test
// cost; doing it for every case turns the full parallel-fork suite into a boot
// storm that starves hooks and flakes unrelated tests. Instead boot once per
// file (beforeAll) and TRUNCATE + reseed between tests (beforeEach) — the same
// per-test isolation the design requires, without the storm. The generous hook
// timeout still covers the single boot under contention.
vi.setConfig({ hookTimeout: 60000 });

const OWNER = { id: 'owner', email: 'owner@test.local' };
const OTHER = { id: 'other', email: 'other@test.local' };
const GHOST_EMAIL = 'ghost@test.local';

let db: TestDb;
let actions: typeof import('@/lib/data/item.actions');
let updateTag: ReturnType<typeof vi.fn>;

function asOwner() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OWNER.email } } as never);
}
function asOther() {
  vi.mocked(auth).mockResolvedValue({ user: { email: OTHER.email } } as never);
}
function asGhost() {
  vi.mocked(auth).mockResolvedValue({ user: { email: GHOST_EMAIL } } as never);
}
function noSession() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

function makeItem(overrides: Partial<ItemDetails> = {}): ItemDetails {
  return {
    id: 'placeholder-id',
    name: 'Valid Item Name',
    description: 'desc',
    quantity_limit: null,
    stores: [],
    lists: [],
    ...overrides,
  };
}

const itemRows = () => db.select().from(items);
const listItemRows = (listId: string) =>
  db.select().from(list_items).where(eq(list_items.list_id, listId));
const storeRows = (itemId: string) =>
  db.select().from(item_stores).where(eq(item_stores.item_id, itemId));

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/lib/data/item.actions');
  ({ updateTag } = (await import('next/cache')) as unknown as {
    updateTag: ReturnType<typeof vi.fn>;
  });
});

beforeEach(async () => {
  // Restore any per-test db spies (db is shared across tests now) and reset the
  // auth mock, then start each case from a clean, freshly seeded database.
  vi.restoreAllMocks();
  await resetDb(db);
  await seedUsers(db, [OWNER, OTHER]);
  updateTag.mockClear();
  asOwner();
});

describe('createItem', () => {
  describe('ItemSchemaValidation', () => {
    it('NameTooShort_ReturnsNameFieldError-NoRow', async () => {
      const res = await actions.createItem(makeItem({ name: 'ab' }));
      expect(res.success).toBe(false);
      expect(res.errors?.name).toBeDefined();
      expect(await itemRows()).toHaveLength(0);
    });

    it('NameTooLong_ReturnsNameFieldError-NoRow', async () => {
      const res = await actions.createItem(makeItem({ name: 'a'.repeat(101) }));
      expect(res.success).toBe(false);
      expect(res.errors?.name).toBeDefined();
      expect(await itemRows()).toHaveLength(0);
    });

    it('ImageUrlInvalid_ReturnsImageUrlFieldError-NoRow', async () => {
      const res = await actions.createItem(makeItem({ image_url: 'notaurl' }));
      expect(res.success).toBe(false);
      expect(res.errors?.image_url).toBeDefined();
      expect(await itemRows()).toHaveLength(0);
    });

    it('StorePartialFields_ReturnsStoresFieldError-NoRow', async () => {
      const res = await actions.createItem(
        makeItem({ stores: [{ name: 'Amazon', link: '', price: '' }] })
      );
      expect(res.success).toBe(false);
      expect(res.errors?.stores).toBeDefined();
      expect(await itemRows()).toHaveLength(0);
    });

    it('StoreLinkInvalidUrl_ReturnsStoresFieldError-NoRow', async () => {
      const res = await actions.createItem(
        makeItem({ stores: [{ name: 'Amazon', link: 'notaurl', price: '9' }] })
      );
      expect(res.success).toBe(false);
      expect(res.errors?.stores).toBeDefined();
      expect(await itemRows()).toHaveLength(0);
    });

    it('QuantityLimitFractional_ReturnsQuantityFieldError-NoRow', async () => {
      const res = await actions.createItem(makeItem({ quantity_limit: 1.5 }));
      expect(res.success).toBe(false);
      expect(res.errors?.quantity_limit).toBeDefined();
      expect(await itemRows()).toHaveLength(0);
    });

    it('QuantityLimitZero_ReturnsQuantityFieldError-NoRow', async () => {
      const res = await actions.createItem(makeItem({ quantity_limit: 0 }));
      expect(res.success).toBe(false);
      expect(res.errors?.quantity_limit).toBeDefined();
      expect(await itemRows()).toHaveLength(0);
    });
  });

  describe('Success', () => {
    it('WithListsAndStores_InsertsItem-PlacesListItem-SkipsEmptyStore-CallsUpdateTagItems', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id });
      await seedItem(db, { id: 'existing', user_id: OWNER.id });
      await seedListItem(db, {
        list_id: 'L',
        item_id: 'existing',
        position: 1000,
      });

      const res = await actions.createItem(
        makeItem({
          name: 'New Gift',
          description: '',
          image_url: 'https://img.test/x.png',
          quantity_limit: 3,
          lists: [{ value: 'L', label: 'L' }],
          stores: [
            { name: 'Amazon', link: 'https://a.test', price: '10' },
            { name: '', link: '', price: '' },
          ],
        })
      );
      expect(res.success).toBe(true);

      const created = (await itemRows()).find((i) => i.name === 'New Gift')!;
      expect(created).toMatchObject({
        name: 'New Gift',
        description: '',
        image_url: 'https://img.test/x.png',
        quantity_limit: 3,
        user_id: OWNER.id,
      });

      const placed = (await listItemRows('L')).find(
        (r) => r.item_id === created.id
      );
      expect(placed?.position).toBe(1000 + 65536);

      const stores = await storeRows(created.id);
      expect(stores).toEqual([
        expect.objectContaining({
          name: 'Amazon',
          link: 'https://a.test',
          price: '10',
          order: 1,
        }),
      ]);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('NoListsNoStores_InsertsItemOnly-DefaultsDescriptionEmpty', async () => {
      const res = await actions.createItem(
        makeItem({ name: 'Bare Item', description: '', lists: [], stores: [] })
      );
      expect(res.success).toBe(true);

      const rows = await itemRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        name: 'Bare Item',
        description: '',
        user_id: OWNER.id,
      });
      expect(await listItemRows('L')).toHaveLength(0);
      expect(await storeRows(rows[0].id)).toHaveLength(0);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('UndefinedListsAndStores_InsertsItemOnly', async () => {
      const res = await actions.createItem({
        id: 'placeholder-id',
        name: 'Undef Fields',
        description: 'd',
        quantity_limit: null,
        lists: undefined as unknown as ItemDetails['lists'],
        stores: undefined as unknown as ItemDetails['stores'],
      });
      expect(res.success).toBe(true);
      const rows = await itemRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Undef Fields');
    });
  });

  describe('AuthGuards', () => {
    it('NoSession_ReturnsUnauthorized-NoRow', async () => {
      noSession();
      const res = await actions.createItem(makeItem());
      expect(res.error).toBe('Unauthorized');
      expect(await itemRows()).toHaveLength(0);
    });

    it('UnknownEmail_ReturnsUnauthorized-NoRow', async () => {
      asGhost();
      const res = await actions.createItem(makeItem());
      expect(res.error).toBe('Unauthorized');
      expect(await itemRows()).toHaveLength(0);
    });
  });

  it('InsertThrows_ReturnsFailedToCreateItem', async () => {
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.createItem(makeItem());
    expect(res.error).toBe('Failed to create item');
  });
});

describe('updateItem', () => {
  describe('AuthGuards', () => {
    it('NoSession_ReturnsUnauthorized', async () => {
      noSession();
      const res = await actions.updateItem(makeItem({ id: 'whatever' }));
      expect(res.error).toBe('Unauthorized');
    });

    it('UnknownEmail_ReturnsUnauthorized', async () => {
      asGhost();
      const res = await actions.updateItem(makeItem({ id: 'whatever' }));
      expect(res.error).toBe('Unauthorized');
    });

    it('ForeignItem_ReturnsUnauthorized-NoWrite', async () => {
      await seedItem(db, { id: 'foreign', user_id: OTHER.id, name: 'Theirs' });
      const res = await actions.updateItem(
        makeItem({ id: 'foreign', name: 'Hacked' })
      );
      expect(res.error).toBe('Unauthorized');
      const row = (await itemRows()).find((i) => i.id === 'foreign');
      expect(row?.name).toBe('Theirs');
    });
  });

  it('InvalidData_ReturnsValidationErrors-NoWrite', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id, name: 'Old' });
    const res = await actions.updateItem(makeItem({ id: 'I', name: 'ab' }));
    expect(res.success).toBe(false);
    expect(res.errors?.name).toBeDefined();
    const row = (await itemRows()).find((i) => i.id === 'I');
    expect(row?.name).toBe('Old');
  });

  it('DescriptionAndImageUrl_WritesBothFields', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    const res = await actions.updateItem({
      id: 'I',
      name: 'New Name',
      description: 'newdesc',
      image_url: 'https://i.test/p.png',
      quantity_limit: 2,
      lists: undefined as unknown as ItemDetails['lists'],
      stores: undefined as unknown as ItemDetails['stores'],
    });
    expect(res.success).toBe(true);
    const row = (await itemRows()).find((i) => i.id === 'I');
    expect(row).toMatchObject({
      description: 'newdesc',
      image_url: 'https://i.test/p.png',
    });
  });

  it('StoreInsertThrows_ReturnsFailedToUpdateItem', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.updateItem(
      makeItem({
        id: 'I',
        lists: [],
        stores: [{ name: 'new', link: 'https://b.test', price: '2' }],
      })
    );
    expect(res.error).toBe('Failed to update item');
  });

  describe('Success', () => {
    it('PartialUpdate_WritesProvidedFields-DiffsListsAndStores-CallsUpdateTagItems', async () => {
      await seedItem(db, {
        id: 'I',
        user_id: OWNER.id,
        name: 'Old',
        quantity_limit: 1,
      });
      await seedList(db, { id: 'L1', user_id: OWNER.id });
      await seedList(db, { id: 'L2', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L1', item_id: 'I', position: 65536 });
      await seedItemStore(db, {
        id: 'S1',
        item_id: 'I',
        name: 'a1',
        link: 'l1',
        price: 'p1',
        order: 1,
      });
      await seedItemStore(db, {
        id: 'S2',
        item_id: 'I',
        name: 'a2',
        link: 'l2',
        price: 'p2',
        order: 2,
      });

      const res = await actions.updateItem(
        makeItem({
          id: 'I',
          name: 'Updated',
          quantity_limit: 5,
          lists: [{ value: 'L2', label: 'L2' }],
          stores: [{ name: 'a1x', link: 'https://a.test', price: 'p1' }],
        })
      );
      expect(res.success).toBe(true);

      const row = (await itemRows()).find((i) => i.id === 'I');
      expect(row).toMatchObject({ name: 'Updated', quantity_limit: 5 });

      expect(await listItemRows('L1')).toHaveLength(0);
      expect(await listItemRows('L2')).toEqual([
        expect.objectContaining({ item_id: 'I', position: 65536 }),
      ]);

      const stores = await storeRows('I');
      expect(stores).toEqual([
        expect.objectContaining({
          id: 'S1',
          name: 'a1x',
          link: 'https://a.test',
          price: 'p1',
        }),
      ]);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('MoreStoresThanExisting_InsertsOverflow-SkipsEmpty', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedItemStore(db, {
        id: 'S1',
        item_id: 'I',
        name: 'a1',
        link: 'l1',
        price: 'p1',
        order: 1,
      });

      const res = await actions.updateItem(
        makeItem({
          id: 'I',
          stores: [
            { name: 'a1x', link: 'https://a.test', price: 'p1' },
            { name: 'new', link: 'https://b.test', price: '2' },
            { name: '', link: '', price: '' },
          ],
        })
      );
      expect(res.success).toBe(true);

      const stores = await storeRows('I');
      expect(stores).toEqual([
        expect.objectContaining({ id: 'S1', name: 'a1x', order: 1 }),
        expect.objectContaining({ name: 'new', link: 'https://b.test', order: 2 }),
      ]);
    });

    it('UnchangedStore_PreservesRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedItemStore(db, {
        id: 'S1',
        item_id: 'I',
        name: 'a1',
        link: 'https://a.test',
        price: 'p1',
        order: 1,
      });

      const res = await actions.updateItem(
        makeItem({
          id: 'I',
          stores: [{ name: 'a1', link: 'https://a.test', price: 'p1' }],
        })
      );
      expect(res.success).toBe(true);
      expect(await storeRows('I')).toEqual([
        expect.objectContaining({
          id: 'S1',
          name: 'a1',
          link: 'https://a.test',
          price: 'p1',
          order: 1,
        }),
      ]);
    });

    it('ReselectExistingList_SkipsReinsert', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedList(db, { id: 'L1', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L1', item_id: 'I', position: 65536 });

      const res = await actions.updateItem(
        makeItem({ id: 'I', lists: [{ value: 'L1', label: 'L1' }] })
      );
      expect(res.success).toBe(true);
      expect(await listItemRows('L1')).toEqual([
        expect.objectContaining({ item_id: 'I', position: 65536 }),
      ]);
    });

    it('OnlyImageUrl_WritesImageUrl-LeavesOtherScalarsUnchanged', async () => {
      await seedItem(db, {
        id: 'I',
        user_id: OWNER.id,
        name: 'Keep',
        description: 'keepdesc',
        quantity_limit: 4,
      });
      const res = await actions.updateItem({
        id: 'I',
        image_url: 'https://x.test/p.png',
        lists: [],
        stores: [],
      } as unknown as ItemDetails);
      expect(res.success).toBe(true);
      const row = (await itemRows()).find((i) => i.id === 'I');
      expect(row).toMatchObject({
        name: 'Keep',
        description: 'keepdesc',
        quantity_limit: 4,
        image_url: 'https://x.test/p.png',
      });
    });

    it('NoLists_RemovesAllAssociations', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedList(db, { id: 'L1', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L1', item_id: 'I', position: 65536 });

      const res = await actions.updateItem(makeItem({ id: 'I', lists: [] }));
      expect(res.success).toBe(true);
      expect(await listItemRows('L1')).toHaveLength(0);
    });
  });

  it('ForeignListAssociation_ReturnsFailedToUpdateItem-ListsUnchanged', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    await seedList(db, { id: 'L1', user_id: OWNER.id });
    await seedListItem(db, { list_id: 'L1', item_id: 'I', position: 65536 });
    await seedList(db, { id: 'LX', user_id: OTHER.id });

    const res = await actions.updateItem(
      makeItem({ id: 'I', lists: [{ value: 'LX', label: 'LX' }] })
    );
    expect(res.error).toBe('Failed to update item');
    expect(await listItemRows('LX')).toHaveLength(0);
    expect(await listItemRows('L1')).toEqual([
      expect.objectContaining({ item_id: 'I' }),
    ]);
  });
});

describe('archiveItem', () => {
  it('Archive_SetsArchivedAtDate-CallsUpdateTagItems', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    const res = await actions.archiveItem('I', true);
    expect(res.success).toBe(true);
    const row = (await itemRows()).find((i) => i.id === 'I');
    expect(row?.archived_at).toBeInstanceOf(Date);
    expect(updateTag).toHaveBeenCalledWith('items');
  });

  it('Unarchive_ClearsArchivedAt', async () => {
    await seedItem(db, {
      id: 'I',
      user_id: OWNER.id,
      archived_at: new Date('2020-01-01'),
    });
    const res = await actions.archiveItem('I', false);
    expect(res.success).toBe(true);
    const row = (await itemRows()).find((i) => i.id === 'I');
    expect(row?.archived_at).toBeNull();
  });

  it('NonOwner_ReturnsForbidden-NoChange', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    asOther();
    const res = await actions.archiveItem('I', true);
    expect(res.error).toBe('Forbidden');
    const row = (await itemRows()).find((i) => i.id === 'I');
    expect(row?.archived_at).toBeNull();
  });

  it('NoSession_ReturnsUnauthorized', async () => {
    noSession();
    const res = await actions.archiveItem('I', true);
    expect(res.error).toBe('Unauthorized');
  });

  it('UnknownEmail_ReturnsUnauthorized', async () => {
    asGhost();
    const res = await actions.archiveItem('I', true);
    expect(res.error).toBe('Unauthorized');
  });

  it('UpdateThrows_ReturnsFailedToArchiveItem', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    vi.spyOn(db, 'update').mockImplementation(() => {
      throw new Error('boom');
    });
    const res = await actions.archiveItem('I', true);
    expect(res.error).toBe('Failed to archive item');
  });
});

describe('deleteItem', () => {
  it('Owner_RemovesRow-CallsUpdateTagItems', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    const res = await actions.deleteItem('I');
    expect(res.success).toBe(true);
    expect(await itemRows()).toHaveLength(0);
    expect(updateTag).toHaveBeenCalledWith('items');
  });

  it('NonOwner_ReturnsFailed-RowPersists', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id });
    asOther();
    const res = await actions.deleteItem('I');
    expect(res.error).toBe('Failed to delete item');
    expect(await itemRows()).toHaveLength(1);
  });

  it('NoSession_ReturnsFailed', async () => {
    noSession();
    const res = await actions.deleteItem('I');
    expect(res.error).toBe('Failed to delete item');
  });

  it('UnknownEmail_ReturnsFailed', async () => {
    asGhost();
    const res = await actions.deleteItem('I');
    expect(res.error).toBe('Failed to delete item');
  });
});

describe('UpdateRecency', () => {
  const STALE = new Date('2020-01-01T00:00:00.000Z');

  const updatedAtById = async () =>
    Object.fromEntries(
      (await db.select().from(lists)).map((r) => [r.id, r.updated_at])
    );

  beforeEach(async () => {
    // I is a member of M1 and M2; OFF has no membership.
    await seedItem(db, { id: 'I', user_id: OWNER.id, name: 'Gift' });
    await seedList(db, { id: 'M1', user_id: OWNER.id, updated_at: STALE });
    await seedList(db, { id: 'M2', user_id: OWNER.id, updated_at: STALE });
    await seedList(db, { id: 'OFF', user_id: OWNER.id, updated_at: STALE });
    await seedListItem(db, { list_id: 'M1', item_id: 'I', position: 65536 });
    await seedListItem(db, { list_id: 'M2', item_id: 'I', position: 65536 });
  });

  it('DeleteItem_BumpsMemberLists-LeavesNonMemberUntouched-CallsUpdateTagLists', async () => {
    const before = Date.now();
    const res = await actions.deleteItem('I');
    const after = Date.now();

    expect(res.success).toBe(true);
    const byId = await updatedAtById();
    expect(byId.M1.getTime()).toBeGreaterThanOrEqual(before);
    expect(byId.M1.getTime()).toBeLessThanOrEqual(after);
    expect(byId.M2.getTime()).toBeGreaterThanOrEqual(before);
    expect(byId.M2.getTime()).toBeLessThanOrEqual(after);
    expect(byId.OFF.toISOString()).toBe(STALE.toISOString());
    expect(updateTag).toHaveBeenCalledWith('lists');
  });

  it('UpdateItemFieldsOnly_LeavesAllUpdatedAtUnchanged', async () => {
    const res = await actions.updateItem(
      makeItem({
        id: 'I',
        name: 'Renamed Gift',
        lists: [
          { value: 'M1', label: 'M1' },
          { value: 'M2', label: 'M2' },
        ],
      })
    );

    expect(res.success).toBe(true);
    const byId = await updatedAtById();
    expect(byId.M1.toISOString()).toBe(STALE.toISOString());
    expect(byId.M2.toISOString()).toBe(STALE.toISOString());
    expect(byId.OFF.toISOString()).toBe(STALE.toISOString());
  });

  it('ArchiveItem_LeavesMemberListsUpdatedAtUnchanged', async () => {
    const res = await actions.archiveItem('I', true);

    expect(res.success).toBe(true);
    const byId = await updatedAtById();
    expect(byId.M1.toISOString()).toBe(STALE.toISOString());
    expect(byId.M2.toISOString()).toBe(STALE.toISOString());
  });
});
