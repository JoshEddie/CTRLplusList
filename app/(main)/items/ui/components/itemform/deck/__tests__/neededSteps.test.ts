import { describe, expect, it } from 'vitest';
import { neededSteps, stepBlocked } from '../neededSteps';
import type { ItemViewModel } from '../viewModel';
import { makeItem } from './test-helpers';

function vm(over: Partial<ItemViewModel> = {}): ItemViewModel {
  return makeItem({
    photos: ['https://a', 'https://b'],
    stores: [{ name: 'shop', link: 'https://shop', price: '29.99' }],
    ...over,
  });
}

describe('neededSteps', () => {
  it('CleanGoodTitlePriceStoreMultiImage_DoneStepsThenPhotoNote', () => {
    expect(neededSteps(vm())).toEqual([
      { step: 'title', complete: true },
      { step: 'price', complete: true },
      { step: 'store', complete: true },
      { step: 'photo', complete: false },
      { step: 'note', complete: false },
    ]);
  });

  it('WarnTitleWithPriceMultiImage_TitleIncompleteAndNoNoteStep', () => {
    expect(neededSteps(vm({ name: 'x'.repeat(60) }))).toEqual([
      { step: 'price', complete: true },
      { step: 'store', complete: true },
      { step: 'photo', complete: false },
      { step: 'title', complete: false },
    ]);
  });

  it('ErrorTitleNoPriceNoStoreNameMultiImage_AllIncompleteInCanonicalOrder', () => {
    expect(
      neededSteps(
        vm({
          name: 'x'.repeat(120),
          stores: [{ name: '', link: 'https://shop', price: '' }],
        })
      )
    ).toEqual([
      { step: 'photo', complete: false },
      { step: 'title', complete: false },
      { step: 'price', complete: false },
      { step: 'store', complete: false },
    ]);
  });

  it('GoodTitleNoPrice_TitleStoreDoneThenPhotoPriceNote', () => {
    expect(
      neededSteps(
        vm({ stores: [{ name: 's', link: 'https://shop', price: '' }] })
      )
    ).toEqual([
      { step: 'title', complete: true },
      { step: 'store', complete: true },
      { step: 'photo', complete: false },
      { step: 'price', complete: false },
      { step: 'note', complete: false },
    ]);
  });

  it('FetchWithoutStoreName_StoreIncompleteAfterDoneSteps', () => {
    expect(
      neededSteps(
        vm({
          photos: ['https://only'],
          stores: [{ name: '', link: 'https://shop', price: '29.99' }],
        })
      )
    ).toEqual([
      { step: 'title', complete: true },
      { step: 'price', complete: true },
      { step: 'photo', complete: false },
      { step: 'store', complete: false },
      { step: 'note', complete: false },
    ]);
  });

  it('SingleImage_PhotoStillNeedsAPick', () => {
    // Generated placeholder art means every flow carries a real photo choice.
    expect(neededSteps(vm({ photos: ['https://only'] }))).toEqual([
      { step: 'title', complete: true },
      { step: 'price', complete: true },
      { step: 'store', complete: true },
      { step: 'photo', complete: false },
      { step: 'note', complete: false },
    ]);
  });

  it('ZeroImages_PhotoIncompleteAfterDoneSteps', () => {
    expect(neededSteps(vm({ photos: [] }))).toEqual([
      { step: 'title', complete: true },
      { step: 'price', complete: true },
      { step: 'store', complete: true },
      { step: 'photo', complete: false },
      { step: 'note', complete: false },
    ]);
  });
});

describe('stepBlocked', () => {
  it('ErrorTierTitle_BlocksTitleStep', () => {
    expect(stepBlocked('title', vm({ name: 'x'.repeat(120) }))).toBe(true);
  });

  it('WarnTierTitle_DoesNotBlockTitleStep', () => {
    expect(stepBlocked('title', vm({ name: 'x'.repeat(60) }))).toBe(false);
  });

  it('GoodTitle_DoesNotBlockTitleStep', () => {
    expect(stepBlocked('title', vm())).toBe(false);
  });

  it('EmptyPrice_BlocksPriceStep', () => {
    expect(
      stepBlocked('price', vm({ stores: [{ name: 's', link: 'l', price: '' }] }))
    ).toBe(true);
  });

  it('MalformedPrice_BlocksPriceStep', () => {
    expect(
      stepBlocked(
        'price',
        vm({ stores: [{ name: 's', link: 'l', price: 'abc' }] })
      )
    ).toBe(true);
  });

  it('ParsablePrice_DoesNotBlockPriceStep', () => {
    expect(stepBlocked('price', vm())).toBe(false);
  });

  it('MissingStoreName_BlocksStoreStep', () => {
    expect(
      stepBlocked(
        'store',
        vm({ stores: [{ name: '', link: 'https://shop', price: '29.99' }] })
      )
    ).toBe(true);
  });

  it('InvalidStoreLink_BlocksStoreStep', () => {
    expect(
      stepBlocked(
        'store',
        vm({ stores: [{ name: 's', link: 'shop', price: '29.99' }] })
      )
    ).toBe(true);
  });

  it('NameAndValidLink_DoesNotBlockStoreStep', () => {
    expect(stepBlocked('store', vm())).toBe(false);
  });

  it('OverLimitDescription_BlocksNoteStep', () => {
    expect(stepBlocked('note', vm({ description: 'x'.repeat(120) }))).toBe(
      true
    );
  });

  it('DescriptionWithinLimit_DoesNotBlockNoteStep', () => {
    expect(stepBlocked('note', vm({ description: 'short' }))).toBe(false);
  });

  it('ZeroPhotos_NeverBlocksPhotoStep', () => {
    expect(stepBlocked('photo', vm({ photos: [] }))).toBe(false);
  });
});
