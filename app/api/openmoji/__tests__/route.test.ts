/**
 * Pins the thing-kind art endpoints: search pages through the catalog, and the
 * art route serves bundled SVGs immutably with the catalog as its whitelist.
 */
import { describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET as search } from '@/app/api/openmoji/route';
import { GET as art } from '@/app/api/openmoji/[code]/route';

const searchRequest = (params: string) =>
  ({ nextUrl: new URL(`https://test.local/api/openmoji${params}`) }) as NextRequest;

const artFor = (code: string) =>
  art({} as NextRequest, { params: Promise.resolve({ code }) });

describe('SearchRoute', () => {
  it('NoQuery_ReturnsTheFirstPageAndSignalsMore', async () => {
    const body = await search(searchRequest('')).json();
    expect(body.entries).toHaveLength(60);
    expect(body.hasMore).toBe(true);
  });

  it('QueryAndLimit_PassThroughToTheCatalogSearch', async () => {
    const body = await search(searchRequest('?q=rocket&limit=5')).json();
    expect(body.entries.length).toBeLessThanOrEqual(5);
    expect(
      body.entries.some((e: { label: string }) => e.label === 'rocket')
    ).toBe(true);
  });

  it('AbsurdLimitAndNegativeOffset_AreClamped', async () => {
    const body = await search(
      searchRequest('?limit=999999&offset=-5')
    ).json();
    expect(body.entries.length).toBeLessThanOrEqual(200);
  });

  it('Offset_WindowsThePage', async () => {
    const first = await search(searchRequest('?limit=60')).json();
    const second = await search(searchRequest('?limit=60&offset=60')).json();
    expect(second.entries[0]).not.toEqual(first.entries[0]);
  });
});

describe('ArtRoute', () => {
  it('CatalogCode_ServesItsSvgImmutably', async () => {
    const res = await artFor('1F415');
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml');
    expect(res.headers.get('Cache-Control')).toContain('immutable');
    expect(await res.text()).toContain('<svg');
  });

  it('CodeOutsideTheCatalog_ServesTheDefaultGlyph', async () => {
    const fallback = await (await artFor('not-a-code')).text();
    expect(fallback).toBe(await (await artFor('2B50')).text());
  });
});
