import { describe, expect, it } from 'vitest';

import {
  GUEST_CLAIMS_MAX_IDS,
  appendGuestClaim,
  overlayGuestClaims,
  parseGuestClaims,
  pruneGuestClaim,
  serializeGuestClaims,
} from '@/lib/data/purchase.cookie';
import { PurchaseView } from '@/lib/types';

const valid = { id: 'uuid-1', name: 'Aunt May', purchases: ['p1', 'p2'] };

describe('parseGuestClaims', () => {
  it('ValidCookie_RoundTripsThroughSerialize', () => {
    expect(parseGuestClaims(serializeGuestClaims(valid))).toEqual(valid);
  });

  it('AbsentValue_ReturnsNull', () => {
    expect(parseGuestClaims(undefined)).toBeNull();
    expect(parseGuestClaims(null)).toBeNull();
    expect(parseGuestClaims('')).toBeNull();
  });

  it('MalformedJson_ReturnsNull', () => {
    expect(parseGuestClaims('{not json')).toBeNull();
  });

  it('OversizedValue_ReturnsNull', () => {
    const oversized = JSON.stringify({
      ...valid,
      name: 'x'.repeat(5000),
    });
    expect(parseGuestClaims(oversized)).toBeNull();
  });

  it('ShapeInvalidValues_ReturnNull', () => {
    expect(parseGuestClaims('"a string"')).toBeNull();
    expect(parseGuestClaims('[]')).toBeNull();
    expect(parseGuestClaims(JSON.stringify({ ...valid, id: '' }))).toBeNull();
    expect(parseGuestClaims(JSON.stringify({ ...valid, id: 7 }))).toBeNull();
    expect(
      parseGuestClaims(JSON.stringify({ id: 'u', purchases: [] }))
    ).toBeNull();
    expect(
      parseGuestClaims(JSON.stringify({ ...valid, purchases: 'p1' }))
    ).toBeNull();
    expect(
      parseGuestClaims(JSON.stringify({ ...valid, purchases: ['p1', 3] }))
    ).toBeNull();
  });
});

describe('appendGuestClaim', () => {
  it('NoExistingCookie_MintsUuidWithSingleId', () => {
    const claims = appendGuestClaim(null, 'p9', 'Gifty');
    expect(claims.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(claims.name).toBe('Gifty');
    expect(claims.purchases).toEqual(['p9']);
  });

  it('ExistingCookie_ReusesIdAndPrependsNewestFirst', () => {
    const claims = appendGuestClaim(valid, 'p9', 'New Name');
    expect(claims.id).toBe('uuid-1');
    expect(claims.name).toBe('New Name');
    expect(claims.purchases).toEqual(['p9', 'p1', 'p2']);
  });

  it('AtCap_PrunesOldestId', () => {
    const full = {
      ...valid,
      purchases: Array.from({ length: GUEST_CLAIMS_MAX_IDS }, (_, i) => `p${i}`),
    };
    const claims = appendGuestClaim(full, 'new', 'Gifty');
    expect(claims.purchases).toHaveLength(GUEST_CLAIMS_MAX_IDS);
    expect(claims.purchases[0]).toBe('new');
    expect(claims.purchases).not.toContain(`p${GUEST_CLAIMS_MAX_IDS - 1}`);
  });
});

describe('pruneGuestClaim', () => {
  it('ListedId_RemovesOnlyTargetPreservingIdentity', () => {
    expect(pruneGuestClaim(valid, 'p1')).toEqual({
      id: 'uuid-1',
      name: 'Aunt May',
      purchases: ['p2'],
    });
  });

  it('UnlistedId_LeavesPurchasesUnchanged', () => {
    expect(pruneGuestClaim(valid, 'nope').purchases).toEqual(['p1', 'p2']);
  });
});

describe('overlayGuestClaims', () => {
  const view = (id: string): PurchaseView => ({
    id,
    by: 'other',
    firstName: 'Someone',
    claimedByViewer: false,
  });

  it('CookieListedPurchase_MarkedSelfAndClaimedByViewer', () => {
    const items = [
      { purchases: [view('p1'), view('p2')] },
      { purchases: [view('p3')] },
    ];
    const result = overlayGuestClaims(items, new Set(['p1']));
    expect(result[0].purchases).toEqual([
      { ...view('p1'), claimedByViewer: true, by: 'self' },
      view('p2'),
    ]);
    expect(result[1]).toBe(items[1]);
  });

  it('EmptyCookieSet_ReturnsItemsUntouched', () => {
    const items = [{ purchases: [view('p1')] }];
    expect(overlayGuestClaims(items, new Set())).toBe(items);
  });
});
