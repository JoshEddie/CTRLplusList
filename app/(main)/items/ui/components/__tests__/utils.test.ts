import { describe, expect, it } from 'vitest';
import type { PurchaseView } from '@/lib/types';
import { claimSummaryOf, formatStorePrice } from '../utils';

describe('formatStorePrice', () => {
  it('StringPrice_FormatsTwoDecimals', () => {
    expect(formatStorePrice('35.5')).toBe('$35.50');
  });

  it('DollarPrefixedString_StripsPrefixBeforeFormatting', () => {
    expect(formatStorePrice('$19.99')).toBe('$19.99');
  });

  it('NumberPrice_Formats', () => {
    expect(formatStorePrice(1234.5)).toBe('$1,234.50');
  });
});

const claim = (over: Partial<PurchaseView> = {}): PurchaseView => ({
  id: 'p1',
  by: 'other',
  name: 'Grace',
  claimedByViewer: false,
  ...over,
});

/**
 * Pins `spoiler-visibility`'s projection at the card: no tier names another
 * party's claim, so the line reports how many rather than who.
 */
describe('claimSummaryOf', () => {
  it('NoClaims_ReturnsEmpty', () => {
    expect(claimSummaryOf([])).toBe('');
  });

  it('OneClaim_ReportsOnePersonRatherThanAName', () => {
    expect(claimSummaryOf([claim()])).toBe('1 person');
  });

  it('SeveralClaims_ReportsTheCount', () => {
    expect(claimSummaryOf([claim(), claim({ id: 'p2' })])).toBe('2 people');
  });

  it('ViewersOwnClaim_IsCountedRatherThanNamed', () => {
    expect(claimSummaryOf([claim({ by: 'self' })])).toBe('1 person');
  });
});
