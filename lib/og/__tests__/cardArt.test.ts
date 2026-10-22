import { describe, expect, it } from 'vitest';

import { cardArtSrc } from '@/lib/og/cardArt';

const BASE64 = 'data:image/svg+xml;base64,';

function decoded(src: string | null) {
  expect(src?.startsWith(BASE64)).toBe(true);
  return Buffer.from(src!.slice(BASE64.length), 'base64').toString('utf8');
}

describe('cardArtSrc', () => {
  it('Utf8Look_ReturnsTheSameSvgAsBase64', async () => {
    const src = await cardArtSrc(
      'data:image/svg+xml;utf8,%3Csvg%20fill%3D%22%23f00%22%3E%C3%A9%3C%2Fsvg%3E'
    );

    expect(decoded(src)).toBe('<svg fill="#f00">é</svg>');
  });

  it('OpenMojiLook_ReturnsTheGlyphFileAsBase64', async () => {
    const svg = decoded(await cardArtSrc('/openmoji/1F415.svg'));

    expect(svg).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
  });

  it('NoArt_ReturnsNull', async () => {
    expect(await cardArtSrc(null)).toBeNull();
  });

  it('PathOutsideOpenMoji_ReturnsNull', async () => {
    expect(await cardArtSrc('/openmoji/../../.env')).toBeNull();
  });

  it('UnknownEncoding_ReturnsNull', async () => {
    expect(
      await cardArtSrc('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E')
    ).toBeNull();
  });
});
