import { describe, expect, it } from 'vitest';
import {
  generatePlaceholderArt,
  PLACEHOLDER_PALETTES,
} from '@/lib/placeholderArt';
import {
  PLACEHOLDER_URI_MAX_LENGTH,
  PLACEHOLDER_URI_PREFIX,
  isPlaceholderUri,
} from '@/lib/placeholderArt.shared';

function decodeSvg(uri: string): string {
  return Buffer.from(uri.slice(PLACEHOLDER_URI_PREFIX.length), 'base64').toString();
}

describe('generatePlaceholderArt', () => {
  it('SameSeed_YieldsByteIdenticalUri', () => {
    expect(generatePlaceholderArt('item-abc')).toBe(
      generatePlaceholderArt('item-abc')
    );
  });

  it('DifferentSeeds_YieldDifferentArtEachOnAPaletteBackground', () => {
    const a = generatePlaceholderArt('item-a');
    const b = generatePlaceholderArt('item-b');
    expect(a).not.toBe(b);
    const backgrounds = PLACEHOLDER_PALETTES.map((p) => `#${p.background}`);
    for (const uri of [a, b]) {
      expect(
        backgrounds.some((color) => decodeSvg(uri).includes(color))
      ).toBe(true);
    }
  });

  it('ManySeeds_UseMoreThanOnePalette', () => {
    const seen = new Set(
      Array.from({ length: 12 }, (_, i) => {
        const svg = decodeSvg(generatePlaceholderArt(`item-${i}`));
        return PLACEHOLDER_PALETTES.findIndex((p) =>
          svg.includes(`#${p.background}`)
        );
      })
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('GeneratedUri_ClassifiesAsPlaceholderAndFitsSizeCap', () => {
    const uri = generatePlaceholderArt('item-abc');
    expect(isPlaceholderUri(uri)).toBe(true);
    expect(uri.length).toBeLessThanOrEqual(PLACEHOLDER_URI_MAX_LENGTH);
  });

  it('HttpUrl_DoesNotClassifyAsPlaceholder', () => {
    expect(isPlaceholderUri('https://example.com/a.jpg')).toBe(false);
    expect(isPlaceholderUri('data:image/svg+xml;utf8,<svg/>')).toBe(false);
  });
});
