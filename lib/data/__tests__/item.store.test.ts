import { describe, expect, it } from 'vitest';
import { validateStore } from '../item.store';

// validateStore owns the tri-state write contract independently of the schema
// refine that guards the API shape upstream, so its rejection branches are
// exercised here directly rather than only through the server actions.
describe('validateStore', () => {
  it('BareStore_ReturnsZeroRows', () => {
    expect(validateStore(null)).toEqual({ stores: [] });
    expect(validateStore({ name: '', link: '', price: '' })).toEqual({
      stores: [],
    });
  });

  it('PricedStore_ReturnsSingleLinklessRow', () => {
    const result = validateStore({ name: '', link: '', price: '12.50' });
    expect(result.stores).toEqual([
      {
        name: '',
        link: '',
        price: '12.50',
        price_fetched_at: null,
        canonical_url: null,
        currency: null,
      },
    ]);
  });

  it('PricedStoreBadPrice_RejectsWithStoreError', () => {
    const result = validateStore({ name: '', link: '', price: 'twelve' });
    expect(result.failure?.errors?.store).toBeDefined();
    expect(result.stores).toBeUndefined();
  });

  it('LinkWithoutName_RejectsWithStoreError', () => {
    const result = validateStore({
      name: '',
      link: 'https://a.test',
      price: '9',
    });
    expect(result.failure?.errors?.store).toEqual(['A store needs a name']);
  });

  it('NameWithoutLink_RejectsWithStoreError', () => {
    const result = validateStore({ name: 'Amazon', link: '', price: '9' });
    expect(result.failure?.errors?.store).toEqual([
      'A store name needs a link',
    ]);
  });

  it('NameAndLinkButInvalidUrl_RejectsWithStoreError', () => {
    const result = validateStore({
      name: 'Amazon',
      link: 'not-a-url',
      price: '9',
    });
    expect(result.failure?.errors?.store).toEqual([
      'A store needs a name, a link, and a price',
    ]);
  });

  it('FullStore_ReturnsNormalizedRowWithProvenance', () => {
    const result = validateStore({
      name: 'Amazon',
      link: 'https://a.test',
      price: '10',
      price_fetched_at: '2026-01-01T00:00:00.000Z',
      canonical_url: 'https://a.test/c',
      currency: 'USD',
    });
    expect(result.stores).toEqual([
      {
        name: 'Amazon',
        link: 'https://a.test',
        price: '10',
        price_fetched_at: '2026-01-01T00:00:00.000Z',
        canonical_url: 'https://a.test/c',
        currency: 'USD',
      },
    ]);
  });
});
