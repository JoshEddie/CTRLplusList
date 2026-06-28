import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  TITLE_SNAPPY,
  amountToPrice,
  priceTier,
  priceToAmount,
  prunePhotos,
  suggestTrim,
  titleTier,
} from '../utils';

describe('deckUtils', () => {
  describe('constants', () => {
    it('Bounds_AreHundredFiftyHundred', () => {
      expect(TITLE_MAX).toBe(100);
      expect(TITLE_SNAPPY).toBe(50);
      expect(DESCRIPTION_MAX).toBe(100);
    });
  });

  describe('titleTier', () => {
    it('Empty_ReturnsErrorNeedsName', () => {
      expect(titleTier('')).toEqual({
        tier: 'error',
        note: 'An item needs a name.',
      });
    });

    it('Whitespace_ReturnsErrorNeedsName', () => {
      expect(titleTier('   ').tier).toBe('error');
    });

    it('Undefined_ReturnsError', () => {
      expect(titleTier(undefined).tier).toBe('error');
    });

    it('UnderThreeChars_ReturnsErrorMatchingSchemaFloor', () => {
      // ItemSchema enforces name.min(3); the gate must block a 1-2 char name
      // inline rather than letting it hit a server-side rejection on Create.
      const result = titleTier('ab');
      expect(result.tier).toBe('error');
      expect(result.note).toContain('3');
    });

    it('AtThreeChars_ReturnsGood', () => {
      expect(titleTier('abc').tier).toBe('good');
    });

    it('AtSnappy_ReturnsGood', () => {
      expect(titleTier('a'.repeat(TITLE_SNAPPY)).tier).toBe('good');
    });

    it('OverSnappyUnderMax_ReturnsWarn', () => {
      const result = titleTier('a'.repeat(TITLE_SNAPPY + 1));
      expect(result.tier).toBe('warn');
      expect(result.note).toContain('description');
    });

    it('AtMax_ReturnsWarn', () => {
      expect(titleTier('a'.repeat(TITLE_MAX)).tier).toBe('warn');
    });

    it('OverMax_ReturnsErrorTrim', () => {
      const result = titleTier('a'.repeat(TITLE_MAX + 1));
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
      expect(trimmed.length).toBeLessThanOrEqual(TITLE_SNAPPY);
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
      expect(trimmed.length).toBeLessThanOrEqual(TITLE_SNAPPY);
      expect(trimmed.startsWith('T-Shirt')).toBe(true);
    });

    it('LeadingBoundaryChar_SkipsIndexZeroBoundary', () => {
      // A comma at index 0 must not produce an empty cut; falls back to a
      // word break within budget.
      const trimmed = suggestTrim(
        ', Premium Stainless Steel Insulated Water Bottle Travel Mug'
      );
      expect(trimmed.length).toBeLessThanOrEqual(TITLE_SNAPPY);
      expect(trimmed.length).toBeGreaterThan(0);
    });

    it('SingleLongWordNoSpaces_HardCutsAtSnappy', () => {
      const trimmed = suggestTrim('x'.repeat(80));
      expect(trimmed).toBe('x'.repeat(TITLE_SNAPPY));
    });

    it('NoBoundary_CutsAtWordBreak', () => {
      const trimmed = suggestTrim(
        'Supercalifragilistic expialidocious wonderful magnificent splendid title'
      );
      expect(trimmed.length).toBeLessThanOrEqual(TITLE_SNAPPY);
      expect(trimmed.endsWith(' ')).toBe(false);
      // Cut on a word boundary, so no partial trailing word.
      expect(trimmed.split(' ').pop()).not.toBe('magnificen');
    });
  });
});
