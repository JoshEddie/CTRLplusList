import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  StoreFields,
  isValidHttpUrl,
  storeLinkError,
  storeNameError,
  storePriceError,
} from '../utils';

function store(overrides: Partial<StoreFields> = {}): StoreFields {
  return { name: '', link: '', price: '', ...overrides };
}

afterEach(() => vi.restoreAllMocks());

describe('isValidHttpUrl', () => {
  it('ValidHttpUrl_NormalizesAndReturnsNoError', () => {
    expect(isValidHttpUrl('https://example.com')).toEqual({
      url: 'https://example.com/',
    });
  });

  it('MissingProtocol_ReportsHttpMissing', () => {
    expect(isValidHttpUrl('example.com')).toEqual({
      url: 'example.com',
      error: 'http:// is missing',
    });
  });

  it('MalformedUrl_ReportsVerifyGuidance', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = isValidHttpUrl('https://');
    expect(result.error).toBe('Please verify the link (i.e. https://example.com)');
  });
});

describe('storeNameError', () => {
  it('EmptyNameWithLinkOrPrice_RequiresName', () => {
    expect(storeNameError('', store({ link: 'x' }))).toBe(
      'Store name required when price or link is added'
    );
    expect(storeNameError('', store({ price: '1' }))).toBe(
      'Store name required when price or link is added'
    );
  });

  it('NamePresentOrNoSiblings_NoError', () => {
    expect(storeNameError('Amazon', store({ link: 'x' }))).toBe('');
    expect(storeNameError('', store())).toBe('');
  });
});

describe('storePriceError', () => {
  it('InvalidFormat_ReportsFormatError', () => {
    expect(storePriceError('abc', store())).toBe('Invalid price format 00.00');
  });

  it('NonNumericWithSibling_ReportsFormatErrorNotRequired', () => {
    expect(storePriceError('abc', store({ name: 'Amazon' }))).toBe(
      'Invalid price format 00.00'
    );
  });

  it('EmptyPriceWithNameOrLink_RequiresPrice', () => {
    expect(storePriceError('', store({ name: 'Amazon' }))).toBe(
      'Price is required when store name and/or link is provided'
    );
  });

  it('ValidPriceOrNoSiblings_NoError', () => {
    expect(storePriceError('12.50', store({ name: 'Amazon' }))).toBe('');
    expect(storePriceError('', store())).toBe('');
  });
});

describe('storeLinkError', () => {
  it('InvalidLink_ReportsWrappedUrlError', () => {
    expect(storeLinkError('not-a-url', store())).toBe(
      'Invalid URL: http:// is missing'
    );
  });

  it('ValidLink_NoError', () => {
    expect(storeLinkError('https://example.com', store())).toBe('');
  });

  it('EmptyLinkWithNameOrPrice_RequiresLink', () => {
    expect(storeLinkError('', store({ price: '1' }))).toBe(
      'Link is required when store name and/or price is provided'
    );
  });

  it('EmptyLinkNoSiblings_NoError', () => {
    expect(storeLinkError('', store())).toBe('');
  });
});
