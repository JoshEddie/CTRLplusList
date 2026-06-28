import { describe, expect, it } from 'vitest';
import { neededSteps } from '../neededSteps';
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
  it('CleanGoodTitlePriceMultiImage_IntroPhotoNote', () => {
    expect(neededSteps(vm())).toEqual(['intro', 'photo', 'note']);
  });

  it('WarnTitleWithPriceMultiImage_IntroPhotoTitleNoNote', () => {
    expect(neededSteps(vm({ name: 'x'.repeat(60) }))).toEqual([
      'intro',
      'photo',
      'title',
    ]);
  });

  it('ErrorTitleNoPriceMultiImage_IntroPhotoTitlePriceNoNote', () => {
    expect(
      neededSteps(
        vm({
          name: 'x'.repeat(120),
          stores: [{ name: 'shop', link: 'https://shop', price: '' }],
        })
      )
    ).toEqual(['intro', 'photo', 'title', 'price']);
  });

  it('GoodTitleNoPriceMultiImage_IntroPhotoPriceNote', () => {
    expect(
      neededSteps(vm({ stores: [{ name: 's', link: 'l', price: '' }] }))
    ).toEqual(['intro', 'photo', 'price', 'note']);
  });

  it('SingleImage_BypassesPhotoStep', () => {
    expect(neededSteps(vm({ photos: ['https://only'] }))).toEqual([
      'intro',
      'note',
    ]);
  });

  it('ZeroImages_IncludesPhotoStep', () => {
    expect(neededSteps(vm({ photos: [] }))).toEqual(['intro', 'photo', 'note']);
  });
});
