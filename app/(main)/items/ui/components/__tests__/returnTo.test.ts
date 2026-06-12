import { describe, expect, it } from 'vitest';

import { sanitizeReturnTo } from '../returnTo';

describe('sanitizeReturnTo', () => {
  describe('RejectedInputs', () => {
    it('NullOrUndefined_ReturnsUndefined', () => {
      expect(sanitizeReturnTo(null)).toBeUndefined();
      expect(sanitizeReturnTo(undefined)).toBeUndefined();
    });

    it('EmptyString_ReturnsUndefined', () => {
      expect(sanitizeReturnTo('')).toBeUndefined();
    });

    it('NonStringTruthyValue_ReturnsUndefined', () => {
      expect(sanitizeReturnTo(5 as unknown as string)).toBeUndefined();
    });

    it('RelativePathWithoutLeadingSlash_ReturnsUndefined', () => {
      expect(sanitizeReturnTo('items?page=2')).toBeUndefined();
    });

    it('ProtocolRelativeDoubleSlash_ReturnsUndefined', () => {
      expect(sanitizeReturnTo('//evil.example.com')).toBeUndefined();
    });

    it('EmbeddedProtocolSeparator_ReturnsUndefined', () => {
      expect(sanitizeReturnTo('/redirect?to=https://evil.example.com')).toBeUndefined();
    });

    it('BackslashInPath_ReturnsUndefined', () => {
      expect(sanitizeReturnTo('/items\\..\\admin')).toBeUndefined();
    });
  });

  describe('AcceptedInputs', () => {
    it('AppRelativePath_ReturnsValueUnchanged', () => {
      expect(sanitizeReturnTo('/items?page=2&sort=name')).toBe(
        '/items?page=2&sort=name'
      );
    });
  });
});
