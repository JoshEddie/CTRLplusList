/**
 * Pins the thing-kind search endpoint: it pages through the catalog and clamps
 * whatever window a caller asks for.
 */
import { describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET as search } from '@/app/api/openmoji/route';

const searchRequest = (params: string) =>
  ({ nextUrl: new URL(`https://test.local/api/openmoji${params}`) }) as NextRequest;

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
