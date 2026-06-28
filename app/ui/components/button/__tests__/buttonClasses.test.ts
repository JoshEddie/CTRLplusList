import { describe, expect, it } from 'vitest';
import { buttonClasses } from '../buttonClasses';
import { VARIANTS, cap } from './test-helpers';

describe('buttonClasses', () => {
  describe('VariantSizeMatrix', () => {
    for (const variant of VARIANTS) {
      it(`Variant${cap(variant)}DefaultSize_ReturnsBtn${cap(variant)}`, () => {
        expect(buttonClasses({ variant })).toBe(`btn ${variant}`);
      });
      it(`Variant${cap(variant)}SizeMd_ReturnsBtn${cap(variant)}WithoutBtnSm`, () => {
        expect(buttonClasses({ variant, size: 'md' })).toBe(`btn ${variant}`);
      });
      it(`Variant${cap(variant)}SizeSm_ReturnsBtn${cap(variant)}BtnSm`, () => {
        expect(buttonClasses({ variant, size: 'sm' })).toBe(
          `btn ${variant} btn-sm`
        );
      });
    }
  });

  describe('ExtraAppend', () => {
    it('ExtraSingleToken_AppendsTokenAsLastEntry', () => {
      expect(buttonClasses({ variant: 'primary', extra: 'page-action' })).toBe(
        'btn primary page-action'
      );
    });
    it('ExtraMultiToken_AppendsAllTokensVerbatim', () => {
      expect(buttonClasses({ variant: 'primary', extra: 'a b c' })).toBe(
        'btn primary a b c'
      );
    });
  });

  describe('FalsyExtra', () => {
    it('ExtraEmptyString_ElidesNoTrailingSpace', () => {
      expect(buttonClasses({ variant: 'primary', extra: '' })).toBe(
        'btn primary'
      );
    });
    it('ExtraUndefined_Elides', () => {
      expect(buttonClasses({ variant: 'primary', extra: undefined })).toBe(
        'btn primary'
      );
    });
  });

  describe('SizeAndExtraTogether', () => {
    it('SizeSmWithExtra_ReturnsBtnPrimaryBtnSmExtra', () => {
      expect(
        buttonClasses({ variant: 'primary', size: 'sm', extra: 'page-action' })
      ).toBe('btn primary btn-sm page-action');
    });
  });

  describe('WidthAxis', () => {
    it('WidthFull_AppendsFullAsLastEntry', () => {
      expect(buttonClasses({ variant: 'primary', width: 'full' })).toBe(
        'btn primary full'
      );
    });
    it('WidthAuto_EmitsNoModifierClass', () => {
      expect(buttonClasses({ variant: 'primary', width: 'auto' })).toBe(
        'btn primary'
      );
    });
    it('WidthOmitted_EmitsNoModifierClass', () => {
      expect(buttonClasses({ variant: 'primary' })).toBe('btn primary');
    });
    // The 44px floor lives on `.btn` (button.css min-height), so the width axis
    // is independent of it: a full-width button keeps `btn` and its size class.
    it('WidthFullWithSizeSm_KeepsBtnAndSizeClass', () => {
      expect(
        buttonClasses({ variant: 'primary', size: 'sm', width: 'full' })
      ).toBe('btn primary btn-sm full');
    });
  });

  describe('WhitespaceContract', () => {
    it('AnySample_HasNoLeadingOrTrailingWhitespace', () => {
      const samples = [
        buttonClasses({ variant: 'primary' }),
        buttonClasses({ variant: 'ghost', size: 'sm' }),
        buttonClasses({ variant: 'link', extra: '' }),
        buttonClasses({ variant: 'danger', size: 'sm', extra: 'x' }),
      ];
      for (const s of samples) {
        expect(s.startsWith(' ')).toBe(false);
        expect(s.endsWith(' ')).toBe(false);
      }
    });
    it('AnySample_HasNoDoubleSpaces', () => {
      const samples = [
        buttonClasses({ variant: 'primary' }),
        buttonClasses({ variant: 'ghost', size: 'sm' }),
        buttonClasses({ variant: 'link', extra: '' }),
        buttonClasses({ variant: 'danger', size: 'sm', extra: 'x' }),
        buttonClasses({ variant: 'primary', extra: 'a b c' }),
      ];
      for (const s of samples) {
        expect(s).not.toMatch(/ {2}/);
      }
    });
  });
});
