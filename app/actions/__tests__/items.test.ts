import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { item_stores, items, list_items, purchases } from '@/db/schema';
import { auth } from '@/lib/auth';
import type { ItemDetails } from '@/lib/types';
import { bootPglite, resetDb } from '@/test/helpers/db';
import { mockNextCache } from '@/test/helpers/next-cache';
import { seedBlock, seedUsers } from '@/test/helpers/seedFollowGraph';

import {
  seedItem,
  seedItemStore,
  seedList,
  seedListItem,
  seedPurchase,
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
let actions: typeof import('@/app/actions/items');
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
const purchaseRows = (itemId: string) =>
  db.select().from(purchases).where(eq(purchases.item_id, itemId));

beforeAll(async () => {
  const booted = await bootPglite();
  db = booted.db;
  holder.db = booted.db;
  actions = await import('@/app/actions/items');
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

describe('getItemEditData', () => {
  it('NoSession_ReturnsNull', async () => {
    noSession();
    expect(await actions.getItemEditData('I')).toBeNull();
  });

  it('UnknownEmail_ReturnsNull', async () => {
    asGhost();
    expect(await actions.getItemEditData('I')).toBeNull();
  });

  it('MissingItem_ReturnsNull', async () => {
    expect(await actions.getItemEditData('nope')).toBeNull();
  });

  it('OwnedItem_ReturnsItemAndLists', async () => {
    await seedItem(db, { id: 'I', user_id: OWNER.id, name: 'Gift' });
    await seedList(db, { id: 'L', user_id: OWNER.id, name: 'Birthday' });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });

    const res = await actions.getItemEditData('I');
    expect(res?.item.id).toBe('I');
    expect(res?.item.name).toBe('Gift');
    expect(res?.item.lists.map((l) => l.id)).toContain('L');
    expect(res?.lists.map((l) => l.id)).toContain('L');
  });
});

describe('createPurchase', () => {
  describe('IdentityContract', () => {
    it('Authed_UsesSessionUserId-DiscardsGuestName', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });

      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Ignored',
      });
      expect(res.success).toBe(true);
      const rows = await purchaseRows('I');
      expect(rows).toEqual([
        expect.objectContaining({ user_id: OWNER.id, guest_name: null }),
      ]);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('GuestWithName_InsertsNullUserIdAndGuestName', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'unlisted',
      });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      noSession();

      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: '  Gifty  ',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({ user_id: null, guest_name: 'Gifty' }),
      ]);
    });

    it('GuestWhitespaceName_ReturnsMissingIdentity-NoRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: '   ',
      });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestNullName_ReturnsMissingIdentity-NoRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('AuthedUnknownEmail_ReturnsUnauthorized', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      asGhost();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Unauthorized');
    });
  });

  describe('ViewabilityAndCapacity', () => {
    it('NonViewableItem_ReturnsItemNotFound-NoRow', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'private' });
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      asOther();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Item not found');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestOnPublicList_InsertsNullUserIdAndGuestName', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'public' });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Aunt May',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toEqual([
        expect.objectContaining({ user_id: null, guest_name: 'Aunt May' }),
      ]);
    });

    it('BlockedCallerOnPublicList_ReturnsItemNotFound-NoRow', async () => {
      await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'public' });
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      await seedBlock(db, OWNER.id, OTHER.id);
      asOther();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Item not found');
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('DuplicateSameUser_ReturnsDuplicateClaim-NoNewRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Duplicate claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('DuplicateSameGuest_ReturnsDuplicateClaim-NoNewRow', async () => {
      await seedList(db, {
        id: 'L',
        user_id: OWNER.id,
        visibility: 'unlisted',
      });
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: 'Gifty',
      });
      expect(res.error).toBe('Duplicate claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('CapacityReached_ReturnsFullyClaimed-NoNewRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: 1 });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OTHER.id });
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Fully claimed');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('ConcurrentSameUser_SecondTripsUniqueIndex-ReturnsDuplicateClaim', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      const [a, b] = await Promise.all([
        actions.createPurchase({ item_id: 'I', guest_name: null }),
        actions.createPurchase({ item_id: 'I', guest_name: null }),
      ]);
      const results = [a, b];
      expect(results.filter((r) => r.success)).toHaveLength(1);
      expect(results.filter((r) => r.error === 'Duplicate claim')).toHaveLength(
        1
      );
      const rows = await purchaseRows('I');
      expect(rows).toHaveLength(1);
      expect(rows[0].user_id).toBe(OWNER.id);
    });

    it('InsertThrowsNonUnique_ReturnsFailedToCreatePurchase', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: null });
      vi.spyOn(db, 'insert').mockImplementation(() => {
        throw new Error('boom');
      });
      const res = await actions.createPurchase({
        item_id: 'I',
        guest_name: null,
      });
      expect(res.error).toBe('Failed to create purchase');
    });
  });

  // Documents the accepted residual race (spec MODIFIED scenario: concurrent
  // distinct claimants on a limited item). Two guests both pass the best-effort
  // count and both insert because the partial unique index excludes NULL
  // user_id — the stored count exceeds quantity_limit. NOT a guarantee.
  it('TwoDistinctGuestsConcurrent_BothInsertExceedingLimit', async () => {
    await seedList(db, { id: 'L', user_id: OWNER.id, visibility: 'unlisted' });
    await seedItem(db, { id: 'I', user_id: OWNER.id, quantity_limit: 1 });
    await seedListItem(db, { list_id: 'L', item_id: 'I', position: 65536 });
    noSession();

    const [a, b] = await Promise.all([
      actions.createPurchase({ item_id: 'I', guest_name: 'Alice' }),
      actions.createPurchase({ item_id: 'I', guest_name: 'Bob' }),
    ]);
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(await purchaseRows('I')).toHaveLength(2);
  });
});

describe('removePurchase', () => {
  describe('ByPurchaseId', () => {
    it('AuthedOwner_DeletesOwnRow-CallsUpdateTagItems', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('AuthedNonOwner_ReturnsNotYourClaim-RowPersists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      asOther();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('GuestMatchingName_DeletesGuestRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'Gifty',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestOnAuthedRow_ReturnsNotYourClaim-RowPersists', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'whatever',
      });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('GuestWrongName_ReturnsNotYourClaim', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'Wrong',
      });
      expect(res.error).toBe('Not your claim');
    });

    it('GuestEmptyName_ReturnsNotYourClaim', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: '',
      });
      expect(res.error).toBe('Not your claim');
    });

    it('GhostSessionMatchingGuestRow_DeletesRow', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      asGhost();
      const res = await actions.removePurchase({
        purchase_id: 'p1',
        guest_name: 'Gifty',
      });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
    });

    it('GuestNoNameSupplied_ReturnsNotYourClaim', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, {
        id: 'p1',
        item_id: 'I',
        user_id: null,
        guest_name: 'Gifty',
      });
      noSession();
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Not your claim');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('MissingRow_ReturnsNotFound', async () => {
      const res = await actions.removePurchase({ purchase_id: 'nope' });
      expect(res.error).toBe('Not found');
    });

    it('DeleteThrows_ReturnsFailedToRemovePurchase', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      vi.spyOn(db, 'delete').mockImplementation(() => {
        throw new Error('boom');
      });
      const res = await actions.removePurchase({ purchase_id: 'p1' });
      expect(res.error).toBe('Failed to remove purchase');
    });
  });

  describe('LegacyItemScoped', () => {
    it('Authed_DeletesOwnRows-CallsUpdateTagItems', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      const res = await actions.removePurchase({ item_id: 'I' });
      expect(res.success).toBe(true);
      expect(await purchaseRows('I')).toHaveLength(0);
      expect(updateTag).toHaveBeenCalledWith('items');
    });

    it('Unauthenticated_ReturnsMissingIdentity', async () => {
      await seedItem(db, { id: 'I', user_id: OWNER.id });
      await seedPurchase(db, { id: 'p1', item_id: 'I', user_id: OWNER.id });
      noSession();
      const res = await actions.removePurchase({ item_id: 'I' });
      expect(res.error).toBe('Missing identity');
      expect(await purchaseRows('I')).toHaveLength(1);
    });

    it('MissingItemId_ReturnsMissingIdentity', async () => {
      const res = await actions.removePurchase({ item_id: '' });
      expect(res.error).toBe('Missing identity');
    });
  });
});
