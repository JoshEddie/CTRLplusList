import { describe, expect, it } from 'vitest';
import {
  compositeOver,
  contrastRatio,
  parseColor,
  relativeLuminance,
} from '../contrast';

describe('contrast', () => {
  describe('contrastRatio', () => {
    it('BlackOnWhite_Ratio21', () => {
      expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
    });

    it('WhiteOnWhite_Ratio1', () => {
      expect(contrastRatio('#fff', '#fff')).toBe(1);
    });

    // #767676 on white is the canonical WCAG AA boundary gray (~4.54:1).
    it('KnownThresholdPair_AboveAA', () => {
      const ratio = contrastRatio('#767676', '#fff');
      expect(ratio).toBeCloseTo(4.54, 1);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('OrderInvariant_SameRatioForSwappedArgs', () => {
      expect(contrastRatio('#000', '#fff')).toBeCloseTo(
        contrastRatio('#fff', '#000'),
        10
      );
    });
  });

  describe('relativeLuminance', () => {
    it('Black_LuminanceZero', () => {
      expect(relativeLuminance('#000')).toBe(0);
    });

    it('White_LuminanceOne', () => {
      expect(relativeLuminance('#fff')).toBeCloseTo(1, 10);
    });
  });

  describe('compositeOver', () => {
    it('HalfAlpha_IsMidpointOfForegroundAndBackground', () => {
      const result = compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, '#fff');
      expect(result).toEqual({ r: 127.5, g: 127.5, b: 127.5, a: 1 });
    });

    it('FullAlpha_ReturnsForegroundUnchanged', () => {
      const result = compositeOver({ r: 10, g: 20, b: 30, a: 1 }, '#fff');
      expect(result).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    });
  });

  describe('parseColor', () => {
    it('SixDigitHexUppercase_ParsesToChannels', () => {
      expect(parseColor('#7855F0')).toEqual({ r: 120, g: 85, b: 240, a: 1 });
    });

    it('ThreeDigitHex_ExpandsToChannels', () => {
      expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    });

    it('RgbaString_ParsesChannelsAndAlpha', () => {
      expect(parseColor('rgba(255, 255, 255, 0.92)')).toEqual({
        r: 255,
        g: 255,
        b: 255,
        a: 0.92,
      });
    });

    it('RgbStringNoAlpha_DefaultsAlphaToOne', () => {
      expect(parseColor('rgb(74, 53, 197)')).toEqual({
        r: 74,
        g: 53,
        b: 197,
        a: 1,
      });
    });

    it('Unparseable_ThrowsUnparseableColorError', () => {
      expect(() => parseColor('hsl(0,0%,0%)')).toThrow(/Unparseable color/);
    });
  });
});
