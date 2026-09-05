import { describe, expect, it } from 'vitest';
import { listsSubtext, storeSubtext } from '../summaries';
import type { ItemViewModel } from '../viewModel';
import { makeItem } from './test-helpers';

function vm(over: Partial<ItemViewModel> = {}): ItemViewModel {
  return makeItem({ name: 'Item', photos: [], store: { name: '', link: '', price: '' }, ...over });
}

describe('summaries', () => {
  describe('listsSubtext', () => {
    it('NoList_NotOnAList', () => {
      expect(listsSubtext(vm())).toBe('Not on a list');
    });

    it('OneList_ItsLabel', () => {
      expect(
        listsSubtext(vm({ lists: [{ value: '1', label: 'Birthday' }] }))
      ).toBe('Birthday');
    });

    it('MultipleLists_JoinsLabels', () => {
      expect(
        listsSubtext(
          vm({
            lists: [
              { value: '1', label: 'Birthday' },
              { value: '2', label: 'Wedding' },
            ],
          })
        )
      ).toBe('Birthday, Wedding');
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
