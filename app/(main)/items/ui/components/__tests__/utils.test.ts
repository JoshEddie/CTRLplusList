import { describe, expect, it } from 'vitest';
import type { PurchaseView } from '@/lib/types';
import { claimLabel, claimSummaryOf, formatStorePrice } from '../utils';

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
  firstName: 'Grace',
  claimedByViewer: false,
  ...over,
});

/**
 * Pins `spoiler-visibility`'s projection at the card: below `identity` no other
 * party's claim carries a name, so the line reports how many rather than who.
 */
describe('claimSummaryOf', () => {
  it('NoClaims_ReturnsEmpty', () => {
    expect(claimSummaryOf([], 'identity')).toBe('');
  });

  it('IdentityLevel_JoinsTheNamesWithYouForTheViewersOwn', () => {
    expect(
      claimSummaryOf([claim({ by: 'self' }), claim({ id: 'p2' })], 'identity')
    ).toBe('You, Grace');
  });

  it('IdentityLevelNamelessClaim_FallsBackToSomeone', () => {
    expect(claimSummaryOf([claim({ firstName: undefined })], 'identity')).toBe(
      'Someone'
    );
  });

  it('ClaimsTierOneClaim_ReportsOnePersonRatherThanAName', () => {
    expect(claimSummaryOf([claim()], 'claims')).toBe('1 person');
  });

  it('ClaimsTierSeveralClaims_ReportsTheCount', () => {
    expect(claimSummaryOf([claim(), claim({ id: 'p2' })], 'claims')).toBe(
      '2 people'
    );
  });
});

describe('claimLabel', () => {
  it('ViewersOwnClaim_ReadsYou', () => {
    expect(claimLabel(claim({ by: 'self' }))).toBe('You');
  });

  it('ProxyRecordedClaim_NamesBothParties', () => {
    expect(claimLabel(claim({ claimerFirstName: 'Ida' }))).toBe(
      'Grace — added by Ida'
    );
  });

  it('NamelessClaim_FallsBackToSomeone', () => {
    expect(claimLabel(claim({ firstName: undefined }))).toBe('Someone');
  });
});
