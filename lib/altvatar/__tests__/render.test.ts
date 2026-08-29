import { describe, expect, it } from 'vitest';

import { renderAltvatar } from '@/lib/altvatar/render';
import { ALTVATAR_STYLE_IDS } from '@/lib/altvatar/types';

describe('renderAltvatar', () => {
  const options = { seed: 'fixed-seed', selections: {} };

  it('AnyStyle_ResolvesToAnSvgDataUri', async () => {
    expect(await renderAltvatar('avataaars', options)).toMatch(
      /^data:image\/svg\+xml/
    );
  });

  it('EachRegisteredStyle_LoadsItsOwnCollection', async () => {
    // One dynamic import per style is what splits the bundle; a broken arm
    // would silently draw the default style's art under another style's name.
    const art = await Promise.all(
      ALTVATAR_STYLE_IDS.map((id) => renderAltvatar(id, options))
    );
    expect(new Set(art).size).toBe(ALTVATAR_STYLE_IDS.length);
  });

  it('UnregisteredStyle_DrawsTheDefaultStylesArt', async () => {
    expect(await renderAltvatar('shapes', options)).toBe(
      await renderAltvatar('avataaars', options)
    );
  });

  it('DifferingSelections_ProduceDifferingArt', async () => {
    const bob = await renderAltvatar('avataaars', {
      ...options,
      selections: { hair: 'bob' },
    });
    const fro = await renderAltvatar('avataaars', {
      ...options,
      selections: { hair: 'fro' },
    });
    expect(bob).not.toBe(fro);
  });

  it('ThingStyle_ResolvesToTheBundledArtRoute', async () => {
    // The thing kind leaves the generation path entirely: its art is a
    // bundled picture the route serves, keyed by the stored codepoint.
    expect(
      await renderAltvatar('openmoji', {
        ...options,
        selections: { glyph: '1F415' },
      })
    ).toBe('/api/openmoji/1F415');
  });

  it('ThingStyleWithNoPicture_FallsBackToTheDefaultGlyph', async () => {
    expect(
      await renderAltvatar('openmoji', { ...options, selections: {} })
    ).toBe('/api/openmoji/2B50');
  });
});
