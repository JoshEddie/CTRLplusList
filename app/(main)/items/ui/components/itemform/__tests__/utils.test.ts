import { describe, expect, it } from 'vitest';
import { isValidProductUrl } from '../utils';

describe('isValidProductUrl', () => {
  it('HttpsUrl_ReturnsTrue', () => {
    expect(isValidProductUrl('https://example.com/p')).toBe(true);
  });

  it('HttpUrl_ReturnsTrue', () => {
    expect(isValidProductUrl('http://example.com')).toBe(true);
  });

  it('NonHttpProtocol_ReturnsFalse', () => {
    expect(isValidProductUrl('ftp://example.com')).toBe(false);
  });

  it('BareString_ReturnsFalse', () => {
    expect(isValidProductUrl('not a url')).toBe(false);
  });

  it('EmptyString_ReturnsFalse', () => {
    expect(isValidProductUrl('')).toBe(false);
  });
});
