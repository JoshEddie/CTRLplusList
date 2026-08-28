/**
 * Pins `altvatar`'s legibility SHALL: a face keeps its features at every skin
 * tone offered, and the art is otherwise left exactly as the library drew it.
 */
import { describe, expect, it } from 'vitest';

import { flattenGlyph, liftFeatures } from '@/lib/altvatar/legibility';
import { contrastRatio } from '@/test/helpers/contrast';

const EBONY = '3f2a1d';
const COCOA = '614335';
const ESPRESSO = '763900';
const HONEY = 'ecad80';

const AVATAAARS =
  '<path fill="black" fill-opacity=".6"/><path fill="black" fill-opacity=".1"/>';
const PERSONAS =
  '<path fill="#1B0640"/>' +
  '<path fill="black" opacity=".28" style="mix-blend-mode:overlay"/>' +
  '<path fill="white" opacity=".36" style="mix-blend-mode:overlay"/>';
const TOON = '<path fill="#3F2626" fill-opacity="0.5"/><path fill="#4B2422"/>';
const GLYPH =
  '<g style="mix-blend-mode:overlay"><use href="#icon"/></g>' +
  '<g opacity=".4"><use href="#icon"/></g>';

const contrast = (a: string, b: string): number =>
  contrastRatio(`#${a}`, `#${b}`);

const liftedInk = (skin: string): string =>
  /fill="#([0-9a-f]{6})" fill-opacity="\.6"/.exec(
    liftFeatures(AVATAAARS, 'avataaars', skin)
  )?.[1] ?? '';

describe('liftFeatures', () => {
  it('LightSkin_LeavesTheArtUntouched', () => {
    expect(liftFeatures(AVATAAARS, 'avataaars', HONEY)).toBe(AVATAAARS);
  });

  it('NoSkinColor_LeavesTheArtUntouched', () => {
    expect(liftFeatures(AVATAAARS, 'avataaars', undefined)).toBe(AVATAAARS);
  });

  it('StyleWithNoRule_LeavesTheArtUntouched', () => {
    // A glyph style draws no face, so there is nothing to keep legible.
    expect(liftFeatures(AVATAAARS, 'icons', EBONY)).toBe(AVATAAARS);
  });

  describe('Avataaars', () => {
    it('DarkSkin_LiftsTheFeatureInk', () => {
      expect(liftFeatures(AVATAAARS, 'avataaars', EBONY)).toContain(
        'fill-opacity=".6"'
      );
      expect(liftFeatures(AVATAAARS, 'avataaars', EBONY)).not.toContain(
        'fill="black" fill-opacity=".6"'
      );
    });

    it('DarkSkin_LeavesTheModellingDark', () => {
      // The same black at a tenth of the opacity is shading, not a feature;
      // lifting it would turn the face inside out.
      expect(liftFeatures(AVATAAARS, 'avataaars', EBONY)).toContain(
        'fill="black" fill-opacity=".1"'
      );
    });
  });

  describe('Personas', () => {
    it('DarkSkin_LiftsTheFixedFeatureInk', () => {
      expect(liftFeatures(PERSONAS, 'personas', EBONY)).not.toContain('#1B0640');
    });

    it('DarkSkin_ScalesTheWhiteFaceOverlayBack', () => {
      // At full strength the wash reads as ash on a dark face, which stops the
      // face matching the ears and neck under it.
      const lifted = liftFeatures(PERSONAS, 'personas', EBONY);
      const opacity = Number(
        /fill="white" opacity="([\d.]+)"/.exec(lifted)?.[1]
      );
      expect(opacity).toBeLessThan(0.36);
      expect(opacity).toBeGreaterThan(0);
    });

    it('DarkSkin_LeavesTheDarkeningOverlayAlone', () => {
      // Only the white wash lightens the face; the black overlay is modelling,
      // and scaling it back would flatten the nose and ears.
      expect(liftFeatures(PERSONAS, 'personas', EBONY)).toContain(
        '<path fill="black" opacity=".28" style="mix-blend-mode:overlay"/>'
      );
    });
  });

  describe('ToonHead', () => {
    it('DarkSkin_LiftsTheFixedFeatureInk', () => {
      const lifted = liftFeatures(TOON, 'toon-head', EBONY);
      expect(lifted).not.toContain('#3F2626');
      expect(lifted).not.toContain('#4B2422');
      expect(lifted).toContain('fill-opacity="0.5"');
    });
  });

  it('DarkSkin_LiftsTheInkClearOfTheSkin', () => {
    // The lift has to land somewhere legible, not merely somewhere lighter: a
    // ramp linear in luminance moved the ink on the mid-dark tones and still
    // left the features sunk into the face.
    for (const skin of [EBONY, COCOA, ESPRESSO]) {
      expect(contrast(liftedInk(skin), skin)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('DarkerSkin_LiftsFurtherThanLessDarkSkin', () => {
    // The correction ramps rather than switching at a threshold, so stepping
    // down the swatch row never jumps.
    expect(parseInt(liftedInk(EBONY), 16)).toBeGreaterThan(
      parseInt(liftedInk(COCOA), 16)
    );
  });
});

describe('flattenGlyph', () => {
  it('GlyphArt_RestoresTheDimmedCopyToFullAlpha', () => {
    // The disc paints the glyph through a CSS mask, which reads alpha alone, so
    // a copy left at four-tenths would paint the accent's ink at four-tenths.
    expect(flattenGlyph(GLYPH)).toBe(
      '<g style="mix-blend-mode:overlay"><use href="#icon"/></g>' +
        '<g><use href="#icon"/></g>'
    );
  });

  it('ArtCarryingNoDimmedCopy_IsLeftUntouched', () => {
    expect(flattenGlyph(TOON)).toBe(TOON);
  });
});
