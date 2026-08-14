import { describe, expect, it } from 'vitest';
import { listsQtySubtext, storeSubtext } from '../summaries';
import type { ItemViewModel } from '../viewModel';
import { makeItem } from './test-helpers';

function vm(over: Partial<ItemViewModel> = {}): ItemViewModel {
  return makeItem({ name: 'Item', photos: [], store: { name: '', link: '', price: '' }, ...over });
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

  describe('storeSubtext', () => {
    it('NoStore_AddPrompt', () => {
      expect(storeSubtext(vm())).toBe('Add where to buy it');
    });

    it('CompleteNameAndLink_ShowsName', () => {
      expect(
        storeSubtext(
          vm({
            store: { name: 'Etsy', link: 'https://etsy', price: '5.00' },
          })
        )
      ).toBe('Etsy');
    });

    it('NamelessStore_AddPrompt', () => {
      expect(
        storeSubtext(
          vm({ store: { name: '', link: 'https://etsy', price: '5.00' } })
        )
      ).toBe('Add where to buy it');
    });
  });
});
