/**
 * Pins `altvatar`'s legibility SHALL: a face keeps its features at every skin
 * tone offered, corrected only where the skin behind them makes it necessary,
 * and the art is otherwise left exactly as the library drew it.
 */
import { describe, expect, it } from 'vitest';

import { liftFeatures } from '@/lib/altvatar/legibility';
import { contrastRatio } from '@/test/helpers/contrast';

const EBONY = '3f2a1d';
const COCOA = '614335';
const HONEY = 'ecad80';

// What a mark drawn at `alpha` over the skin actually shows.
const composited = (ink: string, alpha: number, skin: string): string =>
  ink
    .match(/../g)!
    .map((c, i) => {
      const s = parseInt(skin.slice(i * 2, i * 2 + 2), 16);
      return Math.round(s + (parseInt(c, 16) - s) * alpha)
        .toString(16)
        .padStart(2, '0');
    })
    .join('');

const BROW = '<g id="eyebrows-x"><path fill="black" fill-opacity=".6"/></g>';
const AVATAAARS =
  BROW +
  '<g id="mouth-x"><path fill="black" fill-opacity=".1"/></g>' +
  '<g id="accessories-x"><path fill="black" fill-opacity=".6"/></g>' +
  '<g id="eyes-x"><path fill="white"/><path fill="black" fill-opacity=".6"/></g>';
const PERSONAS =
  '<g id="mouth-x"><path fill="#1B0640"/></g>' +
  '<path fill="black" opacity=".28" style="mix-blend-mode:overlay"/>' +
  '<path fill="white" opacity=".36" style="mix-blend-mode:overlay"/>';
const TOON =
  '<g id="eyes-x"><path fill="#3F2626" fill-opacity="0.5"/></g>' +
  '<g id="mouth-x"><path fill="#4B2422"/></g>';

const liftedInk = (skin: string): string =>
  /fill="#([0-9a-f]{6})" fill-opacity="\.6"/.exec(
    liftFeatures(BROW, 'avataaars', skin)
  )?.[1] ?? '';

describe('liftFeatures', () => {
  it('LightSkin_LeavesTheArtUntouched', () => {
    expect(liftFeatures(AVATAAARS, 'avataaars', HONEY)).toBe(AVATAAARS);
  });

  it('NoSkinColor_LeavesTheArtUntouched', () => {
    expect(liftFeatures(AVATAAARS, 'avataaars', undefined)).toBe(AVATAAARS);
  });

  it('StyleWithNoRule_LeavesTheArtUntouched', () => {
    // The thing kind's art draws no skin, so there is nothing to correct.
    expect(liftFeatures(AVATAAARS, 'openmoji', EBONY)).toBe(AVATAAARS);
  });

  it('SkinAlreadyCarryingItsFeatures_LeavesTheArtUntouched', () => {
    // Cocoa's features already clear the measured target as drawn; a lift
    // solved per tone corrects nothing that did not need it.
    expect(liftFeatures(AVATAAARS, 'avataaars', COCOA)).toBe(AVATAAARS);
  });

  describe('Avataaars', () => {
    it('DarkSkin_LiftsTheFeatureInk', () => {
      const lifted = liftFeatures(BROW, 'avataaars', EBONY);
      expect(lifted).toContain('fill-opacity=".6"');
      expect(lifted).not.toContain('fill="black"');
    });

    it('DarkSkin_LeavesTheModellingDark', () => {
      // The same black at a tenth of the opacity is shading, not a feature;
      // lifting it would turn the face inside out.
      expect(liftFeatures(AVATAAARS, 'avataaars', EBONY)).toContain(
        '<g id="mouth-x"><path fill="black" fill-opacity=".1"/></g>'
      );
    });

    it('DarkSkin_LeavesMarksOutsideAFacePartAlone', () => {
      // Sunglasses are inked like a brow but sit over the skin, not on it;
      // lifting them turns the lenses to cream.
      expect(liftFeatures(AVATAAARS, 'avataaars', EBONY)).toContain(
        '<g id="accessories-x"><path fill="black" fill-opacity=".6"/></g>'
      );
    });

    it('DarkSkin_LeavesABackedPartAlone', () => {
      // A pupil reads against the sclera under it, not against the skin, so
      // it is legible whatever the tone is and lifting it erases it.
      expect(liftFeatures(AVATAAARS, 'avataaars', EBONY)).toContain(
        '<g id="eyes-x"><path fill="white"/><path fill="black" fill-opacity=".6"/></g>'
      );
    });
  });

  describe('Personas', () => {
    it('DarkSkin_LiftsTheFixedFeatureInk', () => {
      expect(liftFeatures(PERSONAS, 'personas', EBONY)).not.toContain(
        '#1B0640'
      );
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

  it('DarkSkin_LiftsTheMarkClearOfTheSkin', () => {
    // What has to clear the skin is the mark as drawn — the ink composited at
    // its opacity — and the bar is the measured point below which a face
    // loses its features, not a bar high enough to drag the ink to white.
    expect(
      contrastRatio(`#${composited(liftedInk(EBONY), 0.6, EBONY)}`, `#${EBONY}`)
    ).toBeGreaterThanOrEqual(1.8);
  });
});
