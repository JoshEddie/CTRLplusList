import { describe, expect, it } from 'vitest';
import { ItemSchema } from '../item.schema';

const base = { name: 'A valid item name', quantity_limit: 1 };

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

    it('OverCap_Rejects', () => {
      expect(
        ItemSchema.safeParse({ ...base, name: 'n'.repeat(101) }).success
      ).toBe(false);
    });

    it('UnderMin_Rejects', () => {
      expect(ItemSchema.safeParse({ ...base, name: 'ab' }).success).toBe(false);
    });
  });
});
