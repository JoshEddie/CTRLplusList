import { describe, expect, it } from 'vitest';
import {
  segmentedGroupClasses,
  segmentedOptionClasses,
} from '../segmentedClasses';

describe('segmentedGroupClasses', () => {
  describe('ToneClass', () => {
    it('ToneLight_EmitsToneLightClass', () => {
      expect(segmentedGroupClasses({ tone: 'light' })).toBe(
        'segmented tone-light'
      );
    });

    it('ToneOnDark_EmitsToneOnDarkClass', () => {
      expect(segmentedGroupClasses({ tone: 'on-dark' })).toBe(
        'segmented tone-on-dark'
      );
    });
  });

  describe('Extra', () => {
    it('ToneLightWithExtra_BaseToneLightExtraInOrder', () => {
      expect(segmentedGroupClasses({ tone: 'light', extra: 'foo' })).toBe(
        'segmented tone-light foo'
      );
    });

    it('ToneOnDarkWithExtra_BaseToneOnDarkExtraInOrder', () => {
      expect(segmentedGroupClasses({ tone: 'on-dark', extra: 'bar' })).toBe(
        'segmented tone-on-dark bar'
      );
    });

    it('ToneLightEmptyExtra_Filtered', () => {
      expect(segmentedGroupClasses({ tone: 'light', extra: '' })).toBe(
        'segmented tone-light'
      );
    });

    it('ToneOnDarkUndefinedExtra_Filtered', () => {
      expect(segmentedGroupClasses({ tone: 'on-dark', extra: undefined })).toBe(
        'segmented tone-on-dark'
      );
    });
  });
});

describe('segmentedOptionClasses', () => {
  describe('ActiveClass', () => {
    it('ActiveFalse_ReturnsBaseToken', () => {
      expect(segmentedOptionClasses({ active: false })).toBe(
        'segmented-option'
      );
    });

    it('ActiveTrue_AppendsActive', () => {
      expect(segmentedOptionClasses({ active: true })).toBe(
        'segmented-option active'
      );
    });
  });

  describe('Extra', () => {
    it('ActiveTrueWithExtra_BaseActiveExtraInOrder', () => {
      expect(segmentedOptionClasses({ active: true, extra: 'foo' })).toBe(
        'segmented-option active foo'
      );
    });

    it('ActiveFalseWithExtra_BaseExtra', () => {
      expect(segmentedOptionClasses({ active: false, extra: 'foo' })).toBe(
        'segmented-option foo'
      );
    });

    it('ActiveFalseEmptyExtra_Filtered', () => {
      expect(segmentedOptionClasses({ active: false, extra: '' })).toBe(
        'segmented-option'
      );
    });

    it('ActiveFalseUndefinedExtra_Filtered', () => {
      expect(
        segmentedOptionClasses({ active: false, extra: undefined })
      ).toBe('segmented-option');
    });
  });
});
