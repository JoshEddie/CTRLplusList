import { describe, expect, it } from 'vitest';
import { formatStorePrice, lowestPricedStore, sortedValidStores } from '../utils';

const store = (name: string, link: string, price: string) => ({
  name,
  link,
  price,
});

describe('sortedValidStores', () => {
  it('MixedValidity_KeepsOnlyCompleteStoresPriceAscending', () => {
    const sorted = sortedValidStores([
      store('Etsy', 'https://e', '41.00'),
      store('', 'https://x', '1.00'),
      store('BadLink', 'not-a-url', '2.00'),
      store('Sci', 'https://s', '1e5'),
      store('Amazon', 'https://a', '35.50'),
    ]);
    expect(sorted.map((s) => s.name)).toEqual(['Amazon', 'Etsy']);
  });

  it('DollarPrefixedPrice_SortsByAmountNotNaN', () => {
    const sorted = sortedValidStores([
      store('Etsy', 'https://e', '$41.00'),
      store('Amazon', 'https://a', '35.50'),
    ]);
    expect(sorted.map((s) => s.name)).toEqual(['Amazon', 'Etsy']);
  });

  it('NullishInput_ReturnsEmpty', () => {
    expect(sortedValidStores(null)).toEqual([]);
    expect(sortedValidStores(undefined)).toEqual([]);
  });
});

describe('lowestPricedStore', () => {
  it('NoCompleteStore_ReturnsNull', () => {
    expect(lowestPricedStore([store('', '', '')])).toBeNull();
  });

  it('MultipleComplete_ReturnsCheapest', () => {
    expect(
      lowestPricedStore([
        store('Etsy', 'https://e', '41.00'),
        store('Amazon', 'https://a', '35.50'),
      ])?.name
    ).toBe('Amazon');
  });
});

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
