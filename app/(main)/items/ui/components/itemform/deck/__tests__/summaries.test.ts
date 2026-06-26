import { describe, expect, it } from 'vitest';
import { listsQtySubtext, storesSubtext } from '../summaries';
import type { ItemViewModel } from '../viewModel';

function vm(over: Partial<ItemViewModel> = {}): ItemViewModel {
  return {
    id: '',
    name: 'Item',
    photos: [],
    photoIndex: 0,
    description: '',
    stores: [],
    lists: [],
    qty: 1,
    ...over,
  };
}

describe('summaries', () => {
  describe('listsQtySubtext', () => {
    it('NoListLimitOne_NotOnAListQtyOne', () => {
      expect(listsQtySubtext(vm())).toBe('Not on a list · Qty 1');
    });

    it('OneListUnlimited_NameUnlimited', () => {
      expect(
        listsQtySubtext(
          vm({ lists: [{ value: '1', label: 'Birthday' }], qty: null })
        )
      ).toBe('Birthday · Unlimited');
    });

    it('MultipleLists_JoinsLabels', () => {
      expect(
        listsQtySubtext(
          vm({
            lists: [
              { value: '1', label: 'Birthday' },
              { value: '2', label: 'Wedding' },
            ],
            qty: 2,
          })
        )
      ).toBe('Birthday, Wedding · Qty 2');
    });
  });

  describe('storesSubtext', () => {
    it('NoValidStore_AddPrompt', () => {
      expect(storesSubtext(vm())).toBe('Add where to buy it');
    });

    it('OneStore_ShowsName', () => {
      expect(
        storesSubtext(
          vm({ stores: [{ name: 'Etsy', link: 'https://etsy', price: '5.00' }] })
        )
      ).toBe('Etsy');
    });

    it('TwoStores_ShowsCheapestPlusMore', () => {
      expect(
        storesSubtext(
          vm({
            stores: [
              { name: 'Amazon', link: 'https://a', price: '20.00' },
              { name: 'Etsy', link: 'https://e', price: '5.00' },
            ],
          })
        )
      ).toBe('Etsy +1 more');
    });
  });
});
