/**
 * Pins the thing kind's server art read: a catalog code resolves to its
 * bundled SVG, anything else to the default, and the stored form is the same
 * data-URI shape every generated style uses.
 */
import { describe, expect, it } from 'vitest';

import {
  openmojiDataUri,
  openmojiSvg,
} from '@/lib/altvatar/openmoji.server';

describe('openmojiSvg', () => {
  it('CatalogCode_ReadsThatBundledSvg', async () => {
    const svg = await openmojiSvg('1F415');
    expect(svg).toContain('<svg');
  });

  it('CodeOutsideTheCatalog_ReadsTheDefaultGlyph', async () => {
    // Also the path-traversal guard: nothing a filename is built from leaves
    // the catalog's own set.
    expect(await openmojiSvg('../../package')).toBe(await openmojiSvg('2B50'));
  });
});

describe('openmojiDataUri', () => {
  it('AnyCode_WrapsTheSvgInTheSharedDataUriPrefix', async () => {
    const uri = await openmojiDataUri('1F415');
    expect(uri).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(decodeURIComponent(uri)).toContain('<svg');
  });
});
