import { describe, expect, it } from 'vitest';
import { ItemSchema } from '../item.schema';

const base = { name: 'A valid item name' };

describe('ItemSchema', () => {
  describe('description', () => {
    it('Absent_Accepts', () => {
      expect(ItemSchema.safeParse(base).success).toBe(true);
    });

    it('AtCap_AcceptsUntruncated', () => {
      const description = 'd'.repeat(100);
      const result = ItemSchema.safeParse({ ...base, description });
      expect(result.success).toBe(true);
      // Passthrough, not truncation: the stored value equals the 100-char input.
      expect(result.success && result.data.description).toBe(description);
    });

    it('OverCap_RejectsWithFieldMessage', () => {
      const result = ItemSchema.safeParse({
        ...base,
        description: 'd'.repeat(101),
      });
      expect(result.success).toBe(false);
      const issue = !result.success && result.error.issues[0];
      expect(issue && issue.path).toEqual(['description']);
      expect(issue && issue.message).toBe(
        'Description must be less than 100 characters'
      );
    });

    it('LegacyFarOverCap_RejectsNotSilentlyTruncated', () => {
      // A pre-cap value (150 chars) on edit is surfaced as an error to be
      // trimmed by the user — never accepted-and-shortened behind their back.
      const result = ItemSchema.safeParse({
        ...base,
        description: 'd'.repeat(150),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('name', () => {
    it('AtCap_Accepts', () => {
      expect(
        ItemSchema.safeParse({ ...base, name: 'n'.repeat(100) }).success
      ).toBe(true);
    });

    it('OverCap_RejectsWithItemNameMessage', () => {
      const result = ItemSchema.safeParse({ ...base, name: 'n'.repeat(101) });
      expect(result.success).toBe(false);
      const issue = !result.success && result.error.issues[0];
      expect(issue && issue.message).toBe(
        'Item name must be less than 100 characters'
      );
    });

    it('UnderMin_RejectsWithItemNameMessage', () => {
      const result = ItemSchema.safeParse({ ...base, name: 'ab' });
      expect(result.success).toBe(false);
      const issue = !result.success && result.error.issues[0];
      expect(issue && issue.message).toBe(
        'Item name must be at least 3 characters'
      );
    });
  });

  describe('store', () => {
    it('AllEmptyStore_PassesSchema', () => {
      // Schema-level: an all-empty store is legal (the refine skips it); the
      // completeness check in the actions is what rejects it downstream.
      expect(
        ItemSchema.safeParse({
          ...base,
          store: { name: '', link: '', price: '' },
        }).success
      ).toBe(true);
    });

    it('NullStore_PassesSchema', () => {
      expect(ItemSchema.safeParse({ ...base, store: null }).success).toBe(true);
    });

    it('PartialStore_FailsSchema', () => {
      expect(
        ItemSchema.safeParse({
          ...base,
          store: { name: 'Amazon', link: '', price: '' },
        }).success
      ).toBe(false);
    });

    it('PricedStore_PassesSchema', () => {
      // Price-only (no name, no link) is the PRICED state — schema accepts it;
      // the action's validateStore checks the price format downstream.
      expect(
        ItemSchema.safeParse({
          ...base,
          store: { name: '', link: '', price: '12.00' },
        }).success
      ).toBe(true);
    });

    it('PriceOnlyKeysOmitted_PassesSchema', () => {
      // name/link keys absent entirely (not just empty strings) still resolves
      // to the PRICED state.
      expect(
        ItemSchema.safeParse({ ...base, store: { price: '12.00' } }).success
      ).toBe(true);
    });
  });
  describe('image_candidates', () => {
    const PREFIX = 'data:image/svg+xml;base64,';
    const urls = (n: number) =>
      Array.from({ length: n }, (_, i) => `https://img.test/${i}.jpg`);
    const placeholder = `${PREFIX}${'a'.repeat(100)}`;

    it('FifteenHttpUrls_Accepts', () => {
      expect(
        ItemSchema.safeParse({ ...base, image_candidates: urls(15) }).success
      ).toBe(true);
    });

    it('SixteenHttpUrls_Rejects', () => {
      expect(
        ItemSchema.safeParse({ ...base, image_candidates: urls(16) }).success
      ).toBe(false);
    });

    it('FifteenHttpUrlsPlusOnePlaceholder_AcceptsAsExempt', () => {
      expect(
        ItemSchema.safeParse({
          ...base,
          image_candidates: [...urls(15), placeholder],
        }).success
      ).toBe(true);
    });

    it('TwoPlaceholders_Rejects', () => {
      expect(
        ItemSchema.safeParse({
          ...base,
          image_candidates: [placeholder, `${PREFIX}${'b'.repeat(100)}`],
        }).success
      ).toBe(false);
    });

    it('OversizedPlaceholder_Rejects', () => {
      expect(
        ItemSchema.safeParse({
          ...base,
          image_candidates: [`${PREFIX}${'a'.repeat(9000)}`],
        }).success
      ).toBe(false);
    });

    it('NonPlaceholderDataUri_Rejects', () => {
      expect(
        ItemSchema.safeParse({
          ...base,
          image_candidates: ['data:image/png;base64,aaaa'],
        }).success
      ).toBe(false);
    });

    it('NonUrlEntry_Rejects', () => {
      expect(
        ItemSchema.safeParse({
          ...base,
          image_candidates: ['not-a-url'],
        }).success
      ).toBe(false);
    });
  });
  describe('image_framing_by_url', () => {
    const framed = (framing: Record<string, unknown>) =>
      ItemSchema.safeParse({
        ...base,
        image_framing_by_url: {
          'https://img.test/a.jpg': {
            focal_x: 50,
            focal_y: 50,
            fit: 'cover',
            ...framing,
          },
        },
      }).success;

    it('InRangeFocalAndContainFit_Accepts', () => {
      expect(framed({ focal_x: 0, focal_y: 100, fit: 'contain' })).toBe(true);
    });

    it('FocalAbove100_Rejects', () => {
      expect(framed({ focal_x: 101 })).toBe(false);
    });

    it('FractionalFocal_Rejects', () => {
      expect(framed({ focal_y: 12.5 })).toBe(false);
    });

    it('CssFillFit_Rejects', () => {
      expect(framed({ fit: 'fill' })).toBe(false);
    });
  });
});
