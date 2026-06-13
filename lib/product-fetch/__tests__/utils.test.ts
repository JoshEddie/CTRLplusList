import { describe, expect, it } from 'vitest';

import { isPrivateHostname, normalizePrice } from '../utils';

describe('isPrivateHostname', () => {
  it.each([
    'localhost',
    'sub.localhost',
    'printer.local',
    'service.internal',
    'intranet',
    '192.168.1.1',
    '[::1]',
    '[::ffff:10.0.0.1]',
    '0:0:0:0:0:ffff:10.0.0.1',
  ])('PrivateShapedHost_ReturnsTrue', (host) => {
    expect(isPrivateHostname(host)).toBe(true);
  });

  it('PublicDottedHostname_ReturnsFalse', () => {
    expect(isPrivateHostname('www.amazon.com')).toBe(false);
  });
});

describe('normalizePrice', () => {
  it('FiniteNumber_CoercedToBareString', () => {
    expect(normalizePrice(24.5)).toBe('24.5');
  });

  it('NonFiniteNumber_ReturnsUndefined', () => {
    expect(normalizePrice(NaN)).toBeUndefined();
    expect(normalizePrice(Infinity)).toBeUndefined();
  });

  it('NumericString_TrimmedAndReturned', () => {
    expect(normalizePrice(' 24.50 ')).toBe('24.50');
  });

  it('CurrencyPrefixedString_ReturnsUndefined', () => {
    expect(normalizePrice('$24.50')).toBeUndefined();
  });

  it('EmptyString_ReturnsUndefined', () => {
    expect(normalizePrice('')).toBeUndefined();
  });
});
