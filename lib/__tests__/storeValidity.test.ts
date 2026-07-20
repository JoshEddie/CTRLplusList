import { describe, expect, it } from 'vitest';
import {
  isValidProductUrl,
  primaryStore,
  storeComplete,
  storeValid,
} from '../storeValidity';

const COMPLETE = {
  name: 'Lodge',
  link: 'https://lodge.example/skillet',
  price: '29.99',
};

describe('storeValidity', () => {
  describe('isValidProductUrl', () => {
    it('HttpAndHttpsUrls_Accepted', () => {
      expect(isValidProductUrl('https://a.example/p')).toBe(true);
      expect(isValidProductUrl('http://a.example/p')).toBe(true);
    });

    it('NonHttpSchemesAndGarbage_Rejected', () => {
      expect(isValidProductUrl('ftp://a.example/p')).toBe(false);
      expect(isValidProductUrl('javascript:alert(1)')).toBe(false);
      expect(isValidProductUrl('not a url')).toBe(false);
      expect(isValidProductUrl('')).toBe(false);
    });
  });

  describe('storeComplete', () => {
    it('NameLinkAndGoodPrice_Complete', () => {
      expect(storeComplete(COMPLETE)).toBe(true);
      expect(storeComplete({ ...COMPLETE, price: '$29.99' })).toBe(true);
    });

    it('MissingOrBlankName_Incomplete', () => {
      expect(storeComplete({ ...COMPLETE, name: '' })).toBe(false);
      expect(storeComplete({ ...COMPLETE, name: '   ' })).toBe(false);
    });

    it('InvalidLink_Incomplete', () => {
      expect(storeComplete({ ...COMPLETE, link: '' })).toBe(false);
      expect(storeComplete({ ...COMPLETE, link: 'lodge.example' })).toBe(false);
    });

    it('ScientificNotationPrice_Incomplete', () => {
      // Number('1e5') parses, so the retired isValidStore accepted it; the
      // shared predicate must not.
      expect(storeComplete({ ...COMPLETE, price: '1e5' })).toBe(false);
    });

    it('EmptyOrNonNumericPrice_Incomplete', () => {
      expect(storeComplete({ ...COMPLETE, price: '' })).toBe(false);
      expect(storeComplete({ ...COMPLETE, price: 'twelve' })).toBe(false);
    });

    it('NullishStore_Incomplete', () => {
      expect(storeComplete(null)).toBe(false);
      expect(storeComplete(undefined)).toBe(false);
    });
  });

  describe('storeValid', () => {
    const PRICED = { name: '', link: '', price: '12.00' };

    it('FullStore_Valid', () => {
      expect(storeValid(COMPLETE)).toBe(true);
    });

    it('PricedRow_ValidButNotComplete', () => {
      expect(storeValid(PRICED)).toBe(true);
      expect(storeComplete(PRICED)).toBe(false);
    });

    it('LegacyInvalidLinkRow_Invalid', () => {
      // A dormant row with a broken non-empty link must never resurrect: the
      // empty-link (not merely invalid-link) requirement keeps it filtered.
      expect(storeValid({ name: '', link: 'lodge.example', price: '12.00' })).toBe(
        false
      );
    });

    it('NameWithoutLink_Invalid', () => {
      expect(storeValid({ name: 'Lodge', link: '', price: '12.00' })).toBe(false);
    });

    it('PricedRowWithBadPrice_Invalid', () => {
      expect(storeValid({ name: '', link: '', price: '' })).toBe(false);
      expect(storeValid({ name: '', link: '', price: 'twelve' })).toBe(false);
    });

    it('NullishStore_Invalid', () => {
      expect(storeValid(null)).toBe(false);
      expect(storeValid(undefined)).toBe(false);
    });
  });

  describe('primaryStore', () => {
    const cheap = { ...COMPLETE, name: 'Cheap', price: '9.99' };
    const dollar = { ...COMPLETE, name: 'Dollar', price: '$5.00' };
    const incomplete = { ...COMPLETE, name: 'Broken', link: 'not a url' };
    const priced = { name: '', link: '', price: '3.00' };

    it('PricedOnlyRows_PricedSelected', () => {
      expect(primaryStore([priced])).toBe(priced);
    });

    it('PricedBeatsPricierFull_LowestValidWins', () => {
      expect(primaryStore([COMPLETE, priced])).toBe(priced);
    });

    it('InvalidLinkRowsOnly_RepairFallbackFirstRow', () => {
      const second = { ...incomplete, name: 'Broken 2' };
      expect(primaryStore([incomplete, second])).toBe(incomplete);
    });

    it('MultipleCompleteStores_LowestPricedWins', () => {
      expect(primaryStore([COMPLETE, cheap, dollar])).toBe(dollar);
    });

    it('IncompleteRowsOnly_FirstRowReturned', () => {
      const second = { ...incomplete, name: 'Broken 2' };
      expect(primaryStore([incomplete, second])).toBe(incomplete);
    });

    it('EmptyOrNullishRows_Null', () => {
      expect(primaryStore([])).toBeNull();
      expect(primaryStore(null)).toBeNull();
      expect(primaryStore(undefined)).toBeNull();
    });

    it('MixedRows_CompleteBeatsEarlierIncomplete', () => {
      expect(primaryStore([incomplete, COMPLETE])).toBe(COMPLETE);
    });
  });
});
