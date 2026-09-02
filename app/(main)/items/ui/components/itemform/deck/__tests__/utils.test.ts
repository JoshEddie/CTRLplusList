import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  NAME_SNAPPY,
  amountToPrice,
  isDirtyDraft,
  manualAdvanceReady,
  LINKLESS_PRICE_NOTE,
  photoTier,
  pricePairTier,
  priceTier,
  priceToAmount,
  prunePhotos,
  rowTiers,
  storeTier,
  suggestTrim,
  nameTier,
  type RowField,
} from '../utils';
import type { ItemViewModel } from '../viewModel';

describe('deckUtils', () => {
  describe('constants', () => {
    it('Bounds_AreHundredFiftyHundred', () => {
      expect(NAME_MAX).toBe(100);
      expect(NAME_SNAPPY).toBe(50);
      expect(DESCRIPTION_MAX).toBe(100);
    });
  });

  describe('nameTier', () => {
    it('Empty_ReturnsErrorNeedsName', () => {
      expect(nameTier('')).toEqual({
        tier: 'error',
        note: 'An item needs a name.',
      });
    });

    it('Whitespace_ReturnsErrorNeedsName', () => {
      expect(nameTier('   ').tier).toBe('error');
    });

    it('Undefined_ReturnsError', () => {
      expect(nameTier(undefined).tier).toBe('error');
    });

    it('UnderThreeChars_ReturnsErrorMatchingSchemaFloor', () => {
      // ItemSchema enforces name.min(3); the gate must block a 1-2 char name
      // inline rather than letting it hit a server-side rejection on Create.
      const result = nameTier('ab');
      expect(result.tier).toBe('error');
      expect(result.note).toContain('3');
    });

    it('AtThreeChars_ReturnsGood', () => {
      expect(nameTier('abc').tier).toBe('good');
    });

    it('AtSnappy_ReturnsGood', () => {
      expect(nameTier('a'.repeat(NAME_SNAPPY)).tier).toBe('good');
    });

    it('OverSnappyUnderMax_ReturnsWarn', () => {
      const result = nameTier('a'.repeat(NAME_SNAPPY + 1));
      expect(result.tier).toBe('warn');
      expect(result.note).toContain('description');
    });

    it('AtMax_ReturnsWarn', () => {
      expect(nameTier('a'.repeat(NAME_MAX)).tier).toBe('warn');
    });

    it('OverMax_ReturnsErrorTrim', () => {
      const result = nameTier('a'.repeat(NAME_MAX + 1));
      expect(result.tier).toBe('error');
      expect(result.note).toContain('limit');
    });
  });

  describe('priceTier', () => {
    it('Empty_ReturnsError', () => {
      expect(priceTier('').tier).toBe('error');
    });

    it('Null_ReturnsError', () => {
      expect(priceTier(null).tier).toBe('error');
    });

    it('NonNumeric_ReturnsErrorFormatHint', () => {
      const result = priceTier('twelve dollars');
      expect(result.tier).toBe('error');
      expect(result.note).toContain('19.99');
    });

    it('Numeric_ReturnsGood', () => {
      expect(priceTier('19.99').tier).toBe('good');
    });

    it('DollarPrefixed_ReturnsGood', () => {
      expect(priceTier('$19.99').tier).toBe('good');
    });
  });

  describe('photoTier', () => {
    it('NoPhotos_ReturnsWarnStatingNoPhoto', () => {
      const result = photoTier([]);
      expect(result.tier).toBe('warn');
      expect(result.note).toContain('No photo');
    });

    it('HasPhoto_ReturnsGood', () => {
      expect(photoTier(['https://img/a.jpg'])).toEqual({
        tier: 'good',
        note: '',
      });
    });
  });

  describe('storeTier', () => {
    it('Undefined_ReturnsGoodOptional', () => {
      // Both fields empty is a supported linkless state, not a nag.
      expect(storeTier(undefined)).toEqual({ tier: 'good', note: 'Optional' });
    });

    it('BothFieldsEmpty_ReturnsGoodOptional', () => {
      expect(storeTier({ name: '', link: '' })).toEqual({
        tier: 'good',
        note: 'Optional',
      });
    });

    it('MissingName_ReturnsErrorNamingName', () => {
      const result = storeTier({ name: '', link: 'https://l' });
      expect(result.tier).toBe('error');
      expect(result.note).toContain('name');
    });

    it('MissingLink_ReturnsErrorNamingLink', () => {
      const result = storeTier({ name: 'Lodge', link: '' });
      expect(result.tier).toBe('error');
      expect(result.note).toContain('link');
    });

    it('InvalidLink_ReturnsErrorNamingLink', () => {
      const result = storeTier({ name: 'Lodge', link: 'lodge.example' });
      expect(result.tier).toBe('error');
      expect(result.note).toContain('link');
    });

    it('NameAndValidLink_ReturnsGood', () => {
      expect(storeTier({ name: 'Lodge', link: 'https://l' })).toEqual({
        tier: 'good',
        note: '',
      });
    });
  });

  describe('pricePairTier', () => {
    it('LinklessEmptyPrice_GoodWithNeutralNote', () => {
      expect(pricePairTier({ name: '', link: '', price: '' })).toEqual({
        tier: 'good',
        note: LINKLESS_PRICE_NOTE,
      });
    });

    it('LinklessMalformedPrice_Error', () => {
      expect(pricePairTier({ name: '', link: '', price: 'twelve' }).tier).toBe(
        'error'
      );
    });

    it('LinklessGoodPrice_Good', () => {
      expect(pricePairTier({ name: '', link: '', price: '12.00' })).toEqual({
        tier: 'good',
        note: '',
      });
    });

    it('LinkedEmptyPrice_Error', () => {
      expect(
        pricePairTier({ name: 'Lodge', link: 'https://l', price: '' }).tier
      ).toBe('error');
    });

    it('LinkedGoodPrice_Good', () => {
      expect(
        pricePairTier({ name: 'Lodge', link: 'https://l', price: '9.99' }).tier
      ).toBe('good');
    });
  });

  describe('rowTiers', () => {
    const item = (over: Partial<ItemViewModel> = {}): ItemViewModel => ({
      id: '',
      name: 'Cast Iron Skillet',
      photos: ['https://img/a.jpg'],
      photoIndex: 0,
      placeholder: null,
      description: '',
      store: { name: 'Lodge', link: 'https://lodge', price: '29.99' },
      lists: [],
      ...over,
    });

    it('CompleteItem_AllRowsGood', () => {
      const tiers = rowTiers(item());
      expect(Object.values(tiers).map((r) => r.tier)).toEqual([
        'good',
        'good',
        'good',
        'good',
        'good',
      ]);
    });

    it('BlankLinklessItem_TitleErrorPhotoWarnStorePriceNoteGood', () => {
      // A blank store (name+link both empty) is a supported linkless state —
      // store and price read good, not error.
      const tiers = rowTiers(
        item({
          name: '',
          photos: [],
          store: { name: '', link: '', price: '' },
        })
      );
      expect(tiers.name.tier).toBe('error');
      expect(tiers.price.tier).toBe('good');
      expect(tiers.photo.tier).toBe('warn');
      expect(tiers.store.tier).toBe('good');
      expect(tiers.note.tier).toBe('good');
    });

    it('OverCapDescription_NoteRowErrorWithTrimNote', () => {
      const tiers = rowTiers(item({ description: 'x'.repeat(120) }));
      expect(tiers.note.tier).toBe('error');
      expect(tiers.note.note).toContain('limit');
    });

    it('EmptyDescription_NoteRowGoodWithOptionalNote', () => {
      expect(rowTiers(item({ description: '' })).note).toEqual({
        tier: 'good',
        note: 'Optional',
      });
    });

    it('FilledDescription_NoteRowGoodWithNoNote', () => {
      expect(rowTiers(item({ description: 'A tidy note' })).note).toEqual({
        tier: 'good',
        note: '',
      });
    });
  });

  describe('isDirtyDraft', () => {
    const blank = (): ItemViewModel => ({
      id: '',
      name: '',
      photos: [],
      photoIndex: 0,
      placeholder: null,
      description: '',
      store: { name: '', link: '', price: '' },
      lists: [],
    });

    it('PristineBlank_IsNotDirty', () => {
      expect(isDirtyDraft(blank())).toBe(false);
    });

    it('FailureSeededLinkOnly_IsNotDirty', () => {
      const vm = blank();
      vm.store = { name: '', link: 'https://x.test/p', price: '' };
      expect(isDirtyDraft(vm)).toBe(false);
    });

    it('Name_MakesDirty', () => {
      expect(isDirtyDraft({ ...blank(), name: 'Skillet' })).toBe(true);
    });

    it('Description_MakesDirty', () => {
      expect(isDirtyDraft({ ...blank(), description: 'note' })).toBe(true);
    });

    it('Photo_MakesDirty', () => {
      expect(isDirtyDraft({ ...blank(), photos: ['https://img/a'] })).toBe(
        true
      );
    });

    it('StoreName_MakesDirty', () => {
      const vm = blank();
      vm.store = { name: 'Lodge', link: '', price: '' };
      expect(isDirtyDraft(vm)).toBe(true);
    });

    it('StorePrice_MakesDirty', () => {
      const vm = blank();
      vm.store = { name: '', link: '', price: '9.99' };
      expect(isDirtyDraft(vm)).toBe(true);
    });
  });

  describe('manualAdvanceReady', () => {
    const good = { tier: 'good', note: '' } as const;
    const warn = { tier: 'warn', note: 'n' } as const;
    const error = { tier: 'error', note: 'n' } as const;
    const tiers = (over = {}) => ({
      photo: good,
      name: good,
      note: good,
      price: good,
      store: good,
      ...over,
    });

    const visited = (...fields: RowField[]) => new Set<RowField>(fields);

    it('AllGoodNoVisits_ReturnsTrue', () => {
      expect(manualAdvanceReady(tiers(), visited())).toBe(true);
    });

    it('AnyError_ReturnsFalseEvenAllVisited', () => {
      expect(
        manualAdvanceReady(
          tiers({ price: error }),
          visited('photo', 'name', 'note', 'price', 'store')
        )
      ).toBe(false);
    });

    it('UnvisitedWarn_ReturnsFalse', () => {
      expect(manualAdvanceReady(tiers({ photo: warn }), visited())).toBe(false);
    });

    it('EveryWarnVisited_ReturnsTrue', () => {
      expect(
        manualAdvanceReady(
          tiers({ photo: warn, store: warn }),
          visited('photo', 'store')
        )
      ).toBe(true);
    });

    it('VisitedGoodDoesNotSubstituteForUnvisitedWarn_ReturnsFalse', () => {
      expect(
        manualAdvanceReady(
          tiers({ photo: warn, store: warn }),
          visited('photo', 'name', 'note', 'price')
        )
      ).toBe(false);
    });
  });

  describe('priceToAmount', () => {
    it('Empty_ReturnsNull', () => {
      expect(priceToAmount('')).toBeNull();
    });

    it('NonNumeric_ReturnsNull', () => {
      expect(priceToAmount('abc')).toBeNull();
    });

    it('Numeric_ReturnsNumber', () => {
      expect(priceToAmount('24.50')).toBe(24.5);
    });
  });

  describe('amountToPrice', () => {
    it('Zero_ReturnsTwoDecimalString', () => {
      // $0.00 is a real price a user may type — it must not collapse to unset.
      expect(amountToPrice(0)).toBe('0.00');
    });

    it('Positive_ReturnsTwoDecimalString', () => {
      expect(amountToPrice(19.9)).toBe('19.90');
    });
  });

  describe('prunePhotos', () => {
    // jsdom never loads images; report a passing 400px unless the URL contains
    // "tiny" (40px, below the 200px floor) or "broken" (fires onerror).
    class SizingImage {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(v: string) {
        queueMicrotask(() => {
          if (v.includes('broken')) {
            this.onerror?.();
            return;
          }
          const px = v.includes('tiny') ? 40 : 400;
          this.naturalWidth = px;
          this.naturalHeight = px;
          this.onload?.();
        });
      }
    }

    beforeEach(() => vi.stubGlobal('Image', SizingImage));
    afterEach(() => vi.unstubAllGlobals());

    it('Empty_ReturnsEmpty', async () => {
      expect(await prunePhotos([])).toEqual([]);
    });

    it('Single_ReturnsAsIsWithoutProbing', async () => {
      // Even an undersized lone image is kept (nothing to choose).
      expect(await prunePhotos(['https://img/tiny.jpg'])).toEqual([
        'https://img/tiny.jpg',
      ]);
    });

    it('AllUsable_KeepsAll', async () => {
      expect(
        await prunePhotos(['https://img/a.jpg', 'https://img/b.jpg'])
      ).toEqual(['https://img/a.jpg', 'https://img/b.jpg']);
    });

    it('Undersized_Dropped', async () => {
      expect(
        await prunePhotos([
          'https://img/a.jpg',
          'https://img/tiny-b.jpg',
          'https://img/c.jpg',
        ])
      ).toEqual(['https://img/a.jpg', 'https://img/c.jpg']);
    });

    it('Unloadable_Dropped', async () => {
      expect(
        await prunePhotos([
          'https://img/a.jpg',
          'https://img/broken.jpg',
          'https://img/c.jpg',
        ])
      ).toEqual(['https://img/a.jpg', 'https://img/c.jpg']);
    });

    it('AllFail_FallsBackToFirst', async () => {
      expect(
        await prunePhotos(['https://img/tiny-1.jpg', 'https://img/tiny-2.jpg'])
      ).toEqual(['https://img/tiny-1.jpg']);
    });

    it('StalledLoad_KeptAfterTimeout', async () => {
      class HangingImage {
        naturalWidth = 0;
        naturalHeight = 0;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {}
      }
      vi.useFakeTimers();
      vi.stubGlobal('Image', HangingImage);
      const pending = prunePhotos(['https://img/1.jpg', 'https://img/2.jpg']);
      await vi.advanceTimersByTimeAsync(6000);
      expect(await pending).toEqual(['https://img/1.jpg', 'https://img/2.jpg']);
      vi.useRealTimers();
    });
  });

  describe('suggestTrim', () => {
    it('UnderSnappy_ReturnsUnchanged', () => {
      expect(suggestTrim('Short name')).toBe('Short name');
    });

    it('Undefined_ReturnsEmptyString', () => {
      expect(suggestTrim(undefined)).toBe('');
    });

    it('DashClause_CutsAtBoundaryUnderSnappy', () => {
      const trimmed = suggestTrim(
        "Nike Air Max 270 Men's Shoes - Black/White, Size 10 Wide Width Comfort"
      );
      expect(trimmed).toBe("Nike Air Max 270 Men's Shoes");
      expect(trimmed.length).toBeLessThanOrEqual(NAME_SNAPPY);
    });

    it('CommaClause_CutsAtFirstFittingComma', () => {
      const trimmed = suggestTrim(
        'Stainless Steel Water Bottle, Insulated, Leakproof, 32oz Capacity Bottle'
      );
      expect(trimmed).toBe('Stainless Steel Water Bottle');
    });

    it('IntraWordHyphen_NotTreatedAsBoundary', () => {
      const trimmed = suggestTrim(
        'T-Shirt Premium Cotton Crew Neck Short Sleeve Everyday Tee For Men XL'
      );
      // The hyphen in "T-Shirt" must not produce "T"; falls back to a word break.
      expect(trimmed).not.toBe('T');
      expect(trimmed.length).toBeLessThanOrEqual(NAME_SNAPPY);
      expect(trimmed.startsWith('T-Shirt')).toBe(true);
    });

    it('LeadingBoundaryChar_SkipsIndexZeroBoundary', () => {
      // A comma at index 0 must not produce an empty cut; falls back to a
      // word break within budget.
      const trimmed = suggestTrim(
        ', Premium Stainless Steel Insulated Water Bottle Travel Mug'
      );
      expect(trimmed.length).toBeLessThanOrEqual(NAME_SNAPPY);
      expect(trimmed.length).toBeGreaterThan(0);
    });

    it('SingleLongWordNoSpaces_HardCutsAtSnappy', () => {
      const trimmed = suggestTrim('x'.repeat(80));
      expect(trimmed).toBe('x'.repeat(NAME_SNAPPY));
    });

    it('NoBoundary_CutsAtWordBreak', () => {
      const trimmed = suggestTrim(
        'Supercalifragilistic expialidocious wonderful magnificent splendid title'
      );
      expect(trimmed.length).toBeLessThanOrEqual(NAME_SNAPPY);
      expect(trimmed.endsWith(' ')).toBe(false);
      // Cut on a word boundary, so no partial trailing word.
      expect(trimmed.split(' ').pop()).not.toBe('magnificen');
    });
  });
});
