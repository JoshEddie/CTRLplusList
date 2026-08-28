/**
 * Pins `altvatar`'s style-resolution and whitelist SHALLs: what a style offers,
 * what survives a style change, what reaches the drawing library, and what a
 * payload crossing the trust boundary is allowed to carry.
 */
import { describe, expect, it } from 'vitest';

import {
  offersOf,
  resolveSelections,
  sanitizeSelections,
  toNativeOptions,
  withoutOverlaysOver,
} from '@/lib/altvatar/resolve';
import { avataaarsStyle } from '@/lib/altvatar/styles/avataaars';
import { iconsStyle } from '@/lib/altvatar/styles/icons';
import { personasStyle } from '@/lib/altvatar/styles/personas';
import { AXIS_ORDER } from '@/lib/altvatar/vocabulary';
import type { AltvatarStyle } from '@/lib/altvatar/types';
import { NONE } from '@/lib/altvatar/types';

const axesOf = (style: Parameters<typeof offersOf>[0], selections?: object) =>
  offersOf(style, selections).map((o) => o.axis);

describe('offersOf', () => {
  describe('GatedAxes', () => {
    it('ClothingNotGraphicShirt_OmitsClothingGraphic', () => {
      expect(axesOf(avataaarsStyle, { clothing: 'hoodie' })).not.toContain(
        'clothingGraphic'
      );
    });

    it('ClothingGraphicShirt_OffersClothingGraphic', () => {
      expect(axesOf(avataaarsStyle, { clothing: 'graphic-shirt' })).toContain(
        'clothingGraphic'
      );
    });

    it('FacialHairNone_OmitsFacialHairColor', () => {
      expect(axesOf(avataaarsStyle, { facialHair: NONE })).not.toContain(
        'facialHairColor'
      );
    });

    it('FacialHairChosen_OffersFacialHairColor', () => {
      expect(axesOf(avataaarsStyle, { facialHair: 'beard-light' })).toContain(
        'facialHairColor'
      );
    });

    it('SelectionsOmitted_OffersEveryGatedAxis', () => {
      // Shuffle omits selections so a re-roll still picks a value for an axis
      // that is not showing yet.
      const all = axesOf(avataaarsStyle);
      expect(all).toContain('clothingGraphic');
      expect(all).toContain('facialHairColor');
    });
  });

  describe('AxisOrder', () => {
    it('DeclarationOrderDiffers_PresentsInAuthoredAxisOrder', () => {
      const offered = axesOf(avataaarsStyle);
      const authored = AXIS_ORDER.filter((a) => offered.includes(a));
      expect(offered).toEqual(authored);
    });
  });

  describe('ProbabilityAxes', () => {
    it('AxisCarriesProbability_OffersNoneAsAValue', () => {
      const hair = offersOf(avataaarsStyle).find((o) => o.axis === 'hair');
      expect(hair).toMatchObject({ kind: 'enum' });
      expect(
        hair?.kind === 'enum' && hair.values.some((v) => v.value === NONE)
      ).toBe(true);
    });

    it('AxisCarriesNoProbability_DoesNotOfferNone', () => {
      const clothing = offersOf(avataaarsStyle).find(
        (o) => o.axis === 'clothing'
      );
      expect(
        clothing?.kind === 'enum' &&
          clothing.values.some((v) => v.value === NONE)
      ).toBe(false);
    });

    it('OverlayAxisCarriesNoProbability_OffersNoneAsAValue', () => {
      for (const axis of ['hat', 'glasses'] as const) {
        const offer = offersOf(personasStyle).find((o) => o.axis === axis);
        expect(
          offer?.kind === 'enum' && offer.values.some((v) => v.value === NONE)
        ).toBe(true);
      }
    });

    it('OverlayAxisSetToNone_WritesNoNativeVariant', () => {
      const native = toNativeOptions(personasStyle, {
        hair: 'bob',
        hat: NONE,
        eyes: 'neutral',
        glasses: NONE,
      });
      expect(native).toMatchObject({
        hairVariant: ['bobCut'],
        eyesVariant: ['open'],
      });
    });
  });

  describe('GlyphStyle', () => {
    it('IconsStyle_OffersGlyphOnly', () => {
      expect(axesOf(iconsStyle)).toEqual(['glyph']);
    });
  });
});

describe('resolveSelections', () => {
  it('ValueBothStylesCarry_SurvivesTheStyleChange', () => {
    expect(resolveSelections(personasStyle, { hair: 'curly' }).hair).toBe(
      'curly'
    );
  });

  it('ValueTargetStyleCannotMap_KeepsStoredValueUntouched', () => {
    // `fro` is an avataaars hair personas has no row for. It is kept rather
    // than replaced: personas draws no fro, and substituting another hair
    // would put one the viewer never chose into storage.
    expect(resolveSelections(personasStyle, { hair: 'fro' }).hair).toBe('fro');
  });

  it('SwitchAwayAndBack_ReturnsTheValueTheStyleBetweenCouldNotDraw', () => {
    // The round trip is the point: a hat no intermediate style draws is still
    // the hat that was chosen when a style that draws it comes back.
    const throughPersonas = resolveSelections(personasStyle, { hat: 'hijab' });
    expect(resolveSelections(avataaarsStyle, throughPersonas).hat).toBe(
      'hijab'
    );
  });

  it('AxisHoldingNothing_TakesTheStylesFallback', () => {
    expect(resolveSelections(personasStyle, {}).hair).toBe('bob');
  });

  it('AxisTargetStyleLacks_KeepsStoredValueUntouched', () => {
    // personas draws no shirt graphic, so the axis renders no control and the
    // stored value is left alone for a later switch back.
    expect(
      resolveSelections(personasStyle, { clothingGraphic: 'pizza' })
        .clothingGraphic
    ).toBe('pizza');
  });

  it('ColorAxisBothStylesCarry_CarriesVerbatim', () => {
    expect(
      resolveSelections(personasStyle, { skinColor: 'ffdbb4' }).skinColor
    ).toBe('ffdbb4');
  });

  it('ColorAxisUnset_TakesTargetStyleFallback', () => {
    expect(resolveSelections(personasStyle, {}).skinColor).toBe('edb98a');
  });

  it('EveryAxisTheTargetStyleHas_ResolvesToAConcreteValue', () => {
    const resolved = resolveSelections(iconsStyle, {});
    expect(resolved).toEqual({ glyph: 'star' });
  });
});

describe('withoutOverlaysOver', () => {
  it('AxisAnOverlayCovers_LiftsThatOverlay', () => {
    // avataaars draws hair and headwear through one native option, so a grid
    // of hair tiles under a hat would draw the same hat every time.
    expect(
      withoutOverlaysOver(avataaarsStyle, 'hair', {
        hair: 'fro',
        hat: 'turban',
      }).hat
    ).toBe(NONE);
  });

  it('OverlayAxisItself_IsLeftAlone', () => {
    // The hat's own tiles are the one grid that should keep drawing hats.
    expect(
      withoutOverlaysOver(avataaarsStyle, 'hat', { hat: 'turban' }).hat
    ).toBe('turban');
  });

  it('AxisNoOverlayShares_IsLeftAlone', () => {
    expect(
      withoutOverlaysOver(avataaarsStyle, 'eyes', {
        eyes: 'wink',
        hat: 'turban',
      })
    ).toEqual({ eyes: 'wink', hat: 'turban' });
  });

  it('GlassesDrawnAsEyes_AreLiftedOffTheEyeTiles', () => {
    // personas has no glasses of its own: both pairs are eye values, so the
    // eye axis is the one they cover.
    expect(
      withoutOverlaysOver(personasStyle, 'eyes', {
        eyes: 'wink',
        glasses: 'prescription-1',
      }).glasses
    ).toBe(NONE);
  });
});

describe('toNativeOptions', () => {
  it('MappedValue_WritesNativeNameAndProbability100', () => {
    expect(toNativeOptions(avataaarsStyle, { hair: 'bob' })).toMatchObject({
      topVariant: ['bob'],
      topProbability: 100,
    });
  });

  it('NoneOnProbabilityAxis_WritesProbability0-OmitsNativeName', () => {
    const native = toNativeOptions(avataaarsStyle, { facialHair: NONE });
    expect(native.facialHairProbability).toBe(0);
    expect(native.facialHair).toBeUndefined();
  });

  it('NoneOnOverlayAxis_LeavesTheAxisItPaintsOverIntact', () => {
    // avataaars draws hair and headwear through one native option, so no hat
    // must leave the hair showing rather than baring the head.
    expect(
      toNativeOptions(avataaarsStyle, { hair: 'bob', hat: NONE })
    ).toMatchObject({ topVariant: ['bob'], topProbability: 100 });
  });

  it('HatChosen_OverwritesTheSharedNativeNameAfterHair', () => {
    expect(
      toNativeOptions(avataaarsStyle, { hair: 'bob', hat: 'turban' })
    ).toMatchObject({ topVariant: ['turban'], topProbability: 100 });
  });

  it('ValueThisStyleCannotMapOnAProbabilityAxis_WritesProbability0', () => {
    // A moustache personas cannot draw is no facial hair here, rather than the
    // nearest thing personas happens to have.
    const native = toNativeOptions(personasStyle, {
      facialHair: 'moustache-fancy',
    });
    expect(native.facialHairProbability).toBe(0);
    expect(native.facialHair).toBeUndefined();
  });

  it('ValueThisStyleCannotMapOnAnOverlayAxis_LeavesTheAxisItPaintsOverIntact', () => {
    // A hijab personas cannot draw must not become the cap it can — and must
    // not bare the head either, so the hair underneath keeps showing.
    expect(
      toNativeOptions(personasStyle, { hair: 'bob', hat: 'hijab' })
    ).toMatchObject({ hairVariant: ['bobCut'] });
  });

  it('ValueThisStyleCannotMapOnAnAxisThatCannotBeAbsent_WritesTheStylesFallbackNative', () => {
    // Every face has a mouth, so an unmappable one takes this style's default
    // rather than going missing.
    expect(toNativeOptions(avataaarsStyle, { mouth: 'pacifier' })).toMatchObject(
      { mouthVariant: ['default'] }
    );
  });

  it('AxisUnselected_OmitsItsNativeNameEntirely', () => {
    expect(toNativeOptions(avataaarsStyle, {})).not.toHaveProperty(
      'topVariant'
    );
  });

  it('ColorAxisUnsetWithInheritsFrom_TakesTheColourItInheritsFrom', () => {
    expect(
      toNativeOptions(avataaarsStyle, {
        facialHair: 'beard-light',
        hairColor: 'c93305',
      })
    ).toMatchObject({ facialHairColor: ['c93305'] });
  });

  it('AnyStyle_WritesFullyTransparentBackground', () => {
    // Eight-digit hex rather than the `transparent` keyword, which the drawing
    // library's option schema rejects.
    expect(toNativeOptions(iconsStyle, {}).backgroundColor).toEqual([
      '00000000',
    ]);
  });

  // A style is data, and these two shapes are ones no shipped style declares
  // today. Both are what keeps a style module authored wrong from writing an
  // option the drawing library would reject.
  describe('MisdeclaredStyle', () => {
    const styleWith = (enumAxes: AltvatarStyle['enumAxes']): AltvatarStyle => ({
      id: 'avataaars',
      label: 'Test',
      enumAxes,
      colorAxes: {},
    });

    it('NoneOnAnAxisCarryingNoProbability_WritesTheStylesFallbackNative', () => {
      const style = styleWith({
        clothing: {
          native: 'clothes',
          fallback: 'hoodie',
          map: { hoodie: 'hoodie' },
        },
      });
      // The axis cannot be absent, so `NONE` cannot be honoured; it draws the
      // style's default rather than leaving the part to the seed.
      expect(toNativeOptions(style, { clothing: NONE })).toEqual({
        backgroundColor: ['00000000'],
        clothesVariant: ['hoodie'],
      });
    });

    it('FallbackTheAxisMapDoesNotCarry_WritesNothingForThatAxis', () => {
      const style = styleWith({
        clothing: {
          native: 'clothes',
          fallback: 'overall',
          map: { hoodie: 'hoodie' },
        },
      });
      expect(toNativeOptions(style, { clothing: 'shirt-vneck' })).toEqual({
        backgroundColor: ['00000000'],
      });
    });
  });
});

describe('sanitizeSelections', () => {
  it('CanonicalEnumValue_Kept', () => {
    expect(sanitizeSelections({ eyes: 'wink' })).toEqual({ eyes: 'wink' });
  });

  it('LibraryNativeName_Dropped', () => {
    // `shortFlat` is what the drawing library calls the hair the app calls
    // `short-flat`; a native name must never reach storage.
    expect(sanitizeSelections({ hair: 'shortFlat' })).toEqual({});
  });

  it('AxisTheVocabularyDoesNotName_Dropped', () => {
    expect(sanitizeSelections({ bogus: 'wink' })).toEqual({});
  });

  it('NonStringValue_Dropped', () => {
    expect(sanitizeSelections({ mouth: 5 })).toEqual({});
  });

  it('UppercaseSixDigitHex_KeptLowercased', () => {
    expect(sanitizeSelections({ skinColor: 'EDB98A' })).toEqual({
      skinColor: 'edb98a',
    });
  });

  it('ColorValueThatIsNotSixHexDigits_Dropped', () => {
    expect(sanitizeSelections({ hairColor: 'red' })).toEqual({});
  });
});
