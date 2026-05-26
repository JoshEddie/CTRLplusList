import { describe, expect, it } from 'vitest';
import { chipClasses } from '../chipClasses';

describe('chipClasses', () => {
  describe('ClassComposition', () => {
    it('NoArgs_ReturnsChip', () => {
      expect(chipClasses()).toBe('chip');
    });

    it('EmptyObject_ReturnsChip', () => {
      expect(chipClasses({})).toBe('chip');
    });

    it('ExtraTruthySingleToken_ReturnsChipSpaceExtra', () => {
      expect(chipClasses({ extra: 'foo' })).toBe('chip foo');
    });

    it('ExtraTruthyMultiToken_PreservedVerbatim', () => {
      expect(chipClasses({ extra: 'a b c' })).toBe('chip a b c');
    });

    it('ExtraEmptyString_ReturnsChipOnly', () => {
      expect(chipClasses({ extra: '' })).toBe('chip');
    });

    it('ExtraUndefined_ReturnsChipOnly', () => {
      expect(chipClasses({ extra: undefined })).toBe('chip');
    });
  });
});
