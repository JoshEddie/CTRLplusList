/**
 * Pins the thing kind's server art read: a catalog code resolves to its
 * curated SVG in the same data-URI shape every generated style stores, and
 * anything else falls back to the default rather than reaching for a filename
 * the catalog never named.
 */
import { describe, expect, it } from 'vitest';

import { openmojiDataUri } from '@/lib/altvatar/openmoji.server';

describe('openmojiDataUri', () => {
  it('CatalogCode_WrapsThatSvgInTheSharedDataUriPrefix', async () => {
    const uri = await openmojiDataUri('1F415');
    expect(uri).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(decodeURIComponent(uri)).toContain('<svg');
  });

  it('CodeOutsideTheCatalog_ReadsTheDefaultGlyph', async () => {
    // Also the path-traversal guard: nothing a filename is built from leaves
    // the catalog's own set.
    expect(await openmojiDataUri('../../package')).toBe(
      await openmojiDataUri('2B50')
    );
  });
});
