/**
 * Pins `profiles-surface` — "A profile's accent SHALL render the band its
 * stored preset name carries".
 *
 * Every assertion here walks ACCENT_PRESETS rather than naming a preset or a
 * hex value, so tweaking a colour or adding one needs no edit in this file —
 * an illegible or malformed addition fails on its own.
 */
import {
  contrastRatio,
  hueTravel,
  midpointChromaRatio,
  perceptualDistance,
} from '@/test/helpers/contrast';
import { describe, expect, it } from 'vitest';

import {
  ACCENT_NAMES,
  ACCENT_PRESETS,
  accentVars,
  isAccentName,
  randomAccentName,
} from '@/lib/accent';

const FALLBACK = 'var(--hero-gradient)';
// The custom properties are the module's only export surface, so every colour
// assertion reads the one a component would actually set.
const varsOf = (name: string | null | undefined) =>
  accentVars(name) as Record<string, string>;
// Case-insensitive: the renderer and `parseColor` both take either casing, so
// pinning lowercase would fail a preset that renders correctly.
const HEX = /^#[0-9a-f]{6}$/i;

describe('accent', () => {
  describe('Presets', () => {
    it.each(ACCENT_NAMES)('Preset%s_InkClears45AgainstItsDisc', (name) => {
      const { light, ink } = ACCENT_PRESETS[name];
      // The disc paints the light stop alone, so the ink is a single-colour
      // check rather than one across a gradient.
      expect(varsOf(name)['--accent-disc']).toBe(light);
      expect(varsOf(name)['--accent-ink']).toBe(ink);
      expect(contrastRatio(ink, light)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(ACCENT_NAMES)('Preset%s_BandRunsItsOwnTwoStops', (name) => {
      const { light, dark } = ACCENT_PRESETS[name];
      expect(varsOf(name)['--accent-bg']).toBe(
        `linear-gradient(120deg, ${light}, ${dark})`
      );
    });

    it.each(ACCENT_NAMES)('Preset%s_CarriesThreeParsableColours', (name) => {
      const preset = ACCENT_PRESETS[name];
      expect(preset.light).toMatch(HEX);
      expect(preset.dark).toMatch(HEX);
      expect(preset.ink).toMatch(HEX);
    });

    it.each(ACCENT_NAMES)('Preset%s_BandRunsTwoDistinctStops', (name) => {
      const { light, dark } = ACCENT_PRESETS[name];
      expect(light).not.toBe(dark);
      // Far enough apart to read as a band rather than as one flat colour,
      // measured across lightness and hue together. Hue alone is the wrong
      // axis per preset: a single-hue band like `cardinal` or `denim` travels
      // under 12 degrees on purpose and separates by lightness instead, so a
      // hue floor would fail the presets that have to read as one colour.
      // Palette-wide hue range is pinned below, where it belongs.
      expect(perceptualDistance(light, dark)).toBeGreaterThanOrEqual(0.2);
    });

    it.each(ACCENT_NAMES)('Preset%s_KeepsItsMidpointSaturated', (name) => {
      const { light, dark } = ACCENT_PRESETS[name];
      // A band between exact complements crosses the neutral axis, so its
      // middle greys out and the swatch reads muddy however vivid its ends
      // are. Pinning the midpoint's chroma is what stops a future preset
      // being picked as a true opposite pair.
      expect(midpointChromaRatio(light, dark)).toBeGreaterThanOrEqual(0.5);
    });

    it('Palette_CarriesLongTravelBands', () => {
      // The presets that have to read as one colour stay in their family, so
      // the palette's range comes from the ones that cross it. Pinned as a
      // palette-level property rather than per preset, which would force
      // every red to stop being red.
      const crossings = ACCENT_NAMES.filter((name) => {
        const { light, dark } = ACCENT_PRESETS[name];
        return hueTravel(light, dark) >= 80;
      });
      expect(crossings.length).toBeGreaterThanOrEqual(3);
    });

    it('EveryPreset_CarriesADistinctInk', () => {
      // The ink is also the ring marking the selected swatch, so a shared one
      // would leave two presets indistinguishable when picked.
      const inks = ACCENT_NAMES.map((name) => ACCENT_PRESETS[name].ink);
      expect(new Set(inks).size).toBe(ACCENT_NAMES.length);
    });

    it('EveryPreset_CarriesADistinctBand', () => {
      const bands = ACCENT_NAMES.map((name) => varsOf(name)['--accent-bg']);
      expect(new Set(bands).size).toBe(ACCENT_NAMES.length);
    });

    it.each(ACCENT_NAMES)('Preset%s_ShadowIsACompleteColour', (name) => {
      // 8-digit hex: the alpha belongs to the colour, not to the call site
      // concatenating one onto whatever the dark stop returned.
      expect(varsOf(name)['--accent-shadow']).toMatch(/^#[0-9a-f]{8}$/i);
    });

    it('Palette_OffersMoreThanOneChoice', () => {
      expect(ACCENT_NAMES.length).toBeGreaterThan(1);
    });
  });

  describe('Fallback', () => {
    it.each([null, undefined])(
      'Accent%s_ReturnsHeroGradientAndWhiteInk',
      (value) => {
        expect(varsOf(value)['--accent-bg']).toBe(FALLBACK);
        expect(varsOf(value)['--accent-disc']).toBe(FALLBACK);
        expect(varsOf(value)['--accent-ink']).toBe('var(--light-color)');
        // The marks that sit beside the band fall back to the brand purple,
        // which is what the fallback band's own dark end is.
        expect(varsOf(value)['--accent-dark']).toBe('var(--primary-color)');
        // A complete colour, not the brand token with an alpha stuck on it —
        // that renders as invalid CSS and drops the whole declaration.
        expect(varsOf(value)['--accent-shadow']).toBe(
          'color-mix(in srgb, var(--primary-color) 33%, transparent)'
        );
      }
    );

    it('NameNoPresetCarries_FallsBackRatherThanRenderingNothing', () => {
      const vars = varsOf('not-a-preset');
      expect(vars['--accent-bg']).toBe(FALLBACK);
      expect(vars['--accent-ink']).toBe('var(--light-color)');
      expect(vars['--accent-dark']).toBe('var(--primary-color)');
      expect(vars['--accent-shadow']).toBe(
        'color-mix(in srgb, var(--primary-color) 33%, transparent)'
      );
    });

    it('HeroGradient_IsNotAmongSelectablePresets', () => {
      expect(ACCENT_NAMES.map((n) => varsOf(n)['--accent-bg'])).not.toContain(
        FALLBACK
      );
    });
  });

  describe('isAccentName', () => {
    it.each(ACCENT_NAMES)('Preset%s_ReturnsTrue', (name) => {
      expect(isAccentName(name)).toBe(true);
    });

    it('NameNoPresetCarries_ReturnsFalse', () => {
      expect(isAccentName('not-a-preset')).toBe(false);
    });

    it('PrototypeKey_ReturnsFalse', () => {
      expect(isAccentName('constructor')).toBe(false);
    });
  });

  describe('randomAccentName', () => {
    it('RepeatedCalls_ReturnOnlyPresetsAndCoverMoreThanOne', () => {
      const drawn = new Set(
        Array.from({ length: 400 }, () => randomAccentName())
      );
      for (const name of drawn) expect(isAccentName(name)).toBe(true);
      expect(drawn.size).toBeGreaterThan(1);
    });
  });
});
