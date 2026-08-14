import { describe, expect, it } from 'vitest';
import type { ProductData } from '@/lib/product-fetch/types';
import type { ItemStoreTable, ListTable } from '@/lib/types';
import {
  blankItem,
  seedFromFetch,
  seedFromItem,
  setStoreField,
  toItemDetails,
  type ItemViewModel,
} from '../viewModel';

const fetchedProduct: ProductData = {
  title: 'Cast Iron Skillet',
  imageUrl: 'https://example.com/a.jpg',
  imageUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  price: '29.99',
  currency: 'USD',
  canonicalUrl: 'https://shop.example.com/skillet',
  store: 'example.com',
};

describe('viewModel', () => {
  describe('blankItem', () => {
    it('Default_QuantityIsLimitOfOne', () => {
      expect(blankItem().qty).toBe(1);
    });

    it('NoArgs_HasEmptyStore', () => {
      expect(blankItem().store).toEqual({ name: '', link: '', price: '' });
    });

    it('SeedUrl_PopulatesStoreLink', () => {
      expect(blankItem('https://x.test/p').store.link).toBe(
        'https://x.test/p'
      );
    });

    it('TwoCalls_DoNotShareStoreObject', () => {
      const a = blankItem();
      a.store.name = 'mutated';
      expect(blankItem().store.name).toBe('');
    });
  });

  describe('seedFromFetch', () => {
    it('WithImageUrls_UsesFullPoolActiveFirst', () => {
      const vm = seedFromFetch(fetchedProduct, 'https://x.test/p', 'T');
      expect(vm.photos).toEqual([
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      ]);
      expect(vm.photoIndex).toBe(0);
    });

    it('Always_LeavesDescriptionEmpty', () => {
      const vm = seedFromFetch(
        { ...fetchedProduct, description: 'marketing copy' },
        'https://x.test/p',
        'T'
      );
      expect(vm.description).toBe('');
    });

    it('PriceFetched_StoresProvenanceAndFetchTime', () => {
      const vm = seedFromFetch(fetchedProduct, 'https://x.test/p', '2026-01-01');
      expect(vm.store).toMatchObject({
        name: 'example.com',
        link: 'https://x.test/p',
        price: '29.99',
        price_fetched_at: '2026-01-01',
        canonical_url: 'https://shop.example.com/skillet',
        currency: 'USD',
      });
    });

    it('NoCanonicalUrlOrCurrency_NormalizesToNull', () => {
      const vm = seedFromFetch(
        { ...fetchedProduct, canonicalUrl: undefined, currency: undefined },
        'https://x.test/p',
        'T'
      );
      expect(vm.store.canonical_url).toBeNull();
      expect(vm.store.currency).toBeNull();
    });

    it('NoPrice_LeavesPriceEmptyAndFetchTimeNull', () => {
      const vm = seedFromFetch(
        { ...fetchedProduct, price: undefined },
        'https://x.test/p',
        'T'
      );
      expect(vm.store.price).toBe('');
      expect(vm.store.price_fetched_at).toBeNull();
    });

    it('Always_DefaultsQuantityToOne', () => {
      expect(seedFromFetch(fetchedProduct, 'https://x.test/p', 'T').qty).toBe(1);
    });

    it('ImageUrlOnlyNoUrls_PoolIsActiveOnly', () => {
      const vm = seedFromFetch(
        { ...fetchedProduct, imageUrls: undefined },
        'https://x.test/p',
        'T'
      );
      expect(vm.photos).toEqual(['https://example.com/a.jpg']);
    });

    it('NoImagesAtAll_EmptyPool', () => {
      const vm = seedFromFetch(
        { ...fetchedProduct, imageUrl: undefined, imageUrls: undefined },
        'https://x.test/p',
        'T'
      );
      expect(vm.photos).toEqual([]);
    });
  });

  describe('seedFromItem', () => {
    const baseStore: ItemStoreTable = {
      name: 'shop',
      link: 'https://shop.test',
      price: '10.00',
      price_fetched_at: new Date('2026-02-02T00:00:00.000Z'),
      canonical_url: null,
      currency: null,
    };
    const lists: ListTable[] = [
      {
        id: 'list-1',
        name: 'Birthday',
        subtitle: null,
        occasion: 'birthday',
        date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        user_id: 'u',
        shared: false,
      },
    ];

    it('ActiveImageInPool_SetsPhotoIndexToItsPosition', () => {
      const vm = seedFromItem({
        id: 'i1',
        name: 'Item',
        description: 'note',
        image_url: 'https://example.com/b.jpg',
        image_candidates: [
          'https://example.com/a.jpg',
          'https://example.com/b.jpg',
        ],
        quantity_limit: 3,
        store: baseStore,
        lists,
      });
      expect(vm.photoIndex).toBe(1);
      expect(vm.qty).toBe(3);
      expect(vm.lists).toEqual([{ value: 'list-1', label: 'Birthday' }]);
    });

    it('StoreDateProvenance_ConvertedToIsoString', () => {
      const vm = seedFromItem({
        id: 'i1',
        name: 'Item',
        description: '',
        image_url: null,
        quantity_limit: null,
        store: baseStore,
        lists: [],
      });
      expect(vm.store.price_fetched_at).toBe('2026-02-02T00:00:00.000Z');
    });

    it('NoCandidatesWithImageUrl_PoolIsActiveOnly', () => {
      const vm = seedFromItem({
        id: 'i1',
        name: 'Item',
        description: '',
        image_url: 'https://example.com/only.jpg',
        quantity_limit: 1,
        store: null,
        lists: [],
      });
      expect(vm.photos).toEqual(['https://example.com/only.jpg']);
    });

    it('NoStore_SeedsEmptyStore', () => {
      const vm = seedFromItem({
        id: 'i1',
        name: 'Item',
        description: '',
        image_url: null,
        quantity_limit: 1,
        store: null,
        lists: [],
      });
      expect(vm.store).toEqual({ name: '', link: '', price: '' });
    });

    it('ActiveImageNotInCandidates_PhotoIndexZero', () => {
      const vm = seedFromItem({
        id: 'i1',
        name: 'Item',
        description: '',
        image_url: 'https://example.com/elsewhere.jpg',
        image_candidates: ['https://example.com/a.jpg'],
        quantity_limit: 1,
        store: null,
        lists: [],
      });
      expect(vm.photoIndex).toBe(0);
    });

    it('NoProvenance_NormalizesToNull', () => {
      const vm = seedFromItem({
        id: 'i1',
        name: 'Item',
        description: '',
        image_url: null,
        quantity_limit: 1,
        store: { name: 's', link: 'l', price: '1' },
        lists: [],
      });
      expect(vm.store.price_fetched_at).toBeNull();
    });

    it('StringProvenance_PassesThroughUnchanged', () => {
      const vm = seedFromItem({
        id: 'i1',
        name: 'Item',
        description: '',
        image_url: null,
        quantity_limit: 1,
        store: {
          name: 's',
          link: 'l',
          price: '1',
          price_fetched_at: '2026-03-03T00:00:00.000Z',
        },
        lists: [],
      });
      expect(vm.store.price_fetched_at).toBe('2026-03-03T00:00:00.000Z');
    });
  });

  describe('setStoreField', () => {
    const seeded: ItemViewModel = seedFromFetch(
      fetchedProduct,
      'https://x.test/p',
      '2026-01-01'
    );

    it('PriceEdit_DropsFetchProvenance', () => {
      const next = setStoreField(seeded.store, 'price', '24.99');
      expect(next.price).toBe('24.99');
      expect(next.price_fetched_at).toBeNull();
    });

    it('NameEdit_PreservesFetchProvenance', () => {
      const next = setStoreField(seeded.store, 'name', 'New Store');
      expect(next.name).toBe('New Store');
      expect(next.price_fetched_at).toBe('2026-01-01');
    });

    it('Edit_DoesNotMutateInput', () => {
      setStoreField(seeded.store, 'price', '1.00');
      expect(seeded.store.price).toBe('29.99');
    });
  });

  describe('toItemDetails', () => {
    it('Create_ActiveImageIsSelectedPhotoPoolIsCandidates', () => {
      const vm = seedFromFetch(fetchedProduct, 'https://x.test/p', '2026-01-01');
      vm.photoIndex = 1;
      const details = toItemDetails(vm);
      expect(details.image_url).toBe('https://example.com/b.jpg');
      expect(details.image_candidates).toEqual([
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      ]);
    });

    it('NoPhotos_ActiveImageNull', () => {
      const vm = blankItem();
      expect(toItemDetails(vm).image_url).toBeNull();
    });

    it('DefaultQty_MapsToQuantityLimitOne', () => {
      expect(toItemDetails(blankItem()).quantity_limit).toBe(1);
    });

    it('UnlimitedQty_MapsToNullQuantityLimit', () => {
      const vm = { ...blankItem(), qty: null };
      expect(toItemDetails(vm).quantity_limit).toBeNull();
    });

    it('FetchedStore_PreservesProvenance', () => {
      const vm = seedFromFetch(fetchedProduct, 'https://x.test/p', '2026-01-01');
      expect(toItemDetails(vm).store).toMatchObject({
        price: '29.99',
        price_fetched_at: '2026-01-01',
        canonical_url: 'https://shop.example.com/skillet',
        currency: 'USD',
      });
    });

    it('EditedPrice_DropsProvenanceThroughAdapter', () => {
      const vm = seedFromFetch(fetchedProduct, 'https://x.test/p', '2026-01-01');
      vm.store = setStoreField(vm.store, 'price', '5.00');
      expect(toItemDetails(vm).store?.price_fetched_at).toBeNull();
    });

    it('SelectedPlaceholder_BecomesActiveUrlAndAppendsToCandidates', () => {
      const art = 'data:image/svg+xml;base64,YXJ0';
      const vm = seedFromFetch(fetchedProduct, 'https://x.test/p', '2026-01-01');
      vm.placeholder = art;
      const details = toItemDetails(vm);
      expect(details.image_url).toBe(art);
      expect(details.image_candidates).toEqual([
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
        art,
      ]);
    });

    it('NewPlaceholderSelection_DisplacesSavedPlaceholderInPool', () => {
      const saved = 'data:image/svg+xml;base64,b2xk';
      const fresh = 'data:image/svg+xml;base64,bmV3';
      const vm = {
        ...blankItem(),
        photos: ['https://example.com/a.jpg', saved],
        placeholder: fresh,
      };
      expect(toItemDetails(vm).image_candidates).toEqual([
        'https://example.com/a.jpg',
        fresh,
      ]);
    });

    it('NoPlaceholderSelected_PreviewUrisNeverEnterSubmission', () => {
      const vm = seedFromFetch(fetchedProduct, 'https://x.test/p', '2026-01-01');
      const details = toItemDetails(vm);
      expect(details.image_candidates!.some((url) => url.startsWith('data:'))).toBe(
        false
      );
      expect(details.image_url).toBe('https://example.com/a.jpg');
    });
  });
});
