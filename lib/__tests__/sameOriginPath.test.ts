/**
 * Pins `list-item-management` — "The `returnTo` value SHALL be validated as a
 * same-origin relative path before use", now the one home both that boundary
 * and `signInUser`'s `redirectTo` share. The rule is judged against what URL
 * parsing makes of the string, so the cases the parser rewrites are substance.
 */
import { describe, expect, it } from 'vitest';

import { sameOriginPath } from '@/lib/sameOriginPath';

describe('sameOriginPath', () => {
  describe('RejectedInputs', () => {
    it('NullOrUndefined_ReturnsUndefined', () => {
      expect(sameOriginPath(null)).toBeUndefined();
      expect(sameOriginPath(undefined)).toBeUndefined();
    });

    it('EmptyString_ReturnsUndefined', () => {
      expect(sameOriginPath('')).toBeUndefined();
    });

    it('NonStringTruthyValue_ReturnsUndefined', () => {
      expect(sameOriginPath(5 as unknown as string)).toBeUndefined();
    });

    it('RelativePathWithoutLeadingSlash_ReturnsUndefined', () => {
      expect(sameOriginPath('items?page=2')).toBeUndefined();
    });

    it('AbsoluteUrl_ReturnsUndefined', () => {
      expect(sameOriginPath('https://evil.example.com')).toBeUndefined();
    });

    it('ProtocolRelativeDoubleSlash_ReturnsUndefined', () => {
      expect(sameOriginPath('//evil.example.com')).toBeUndefined();
    });

    it('BackslashAnywhere_ReturnsUndefined', () => {
      expect(sameOriginPath('/\\evil.example.com')).toBeUndefined();
      expect(sameOriginPath('/items\\..\\admin')).toBeUndefined();
    });

    it('EmbeddedProtocolSeparator_ReturnsUndefined', () => {
      expect(
        sameOriginPath('/redirect?to=https://evil.example.com')
      ).toBeUndefined();
    });

    it('TabBeforeTheAuthority_ReturnsUndefined', () => {
      // The parser strips the tab, leaving `//evil.example.com`.
      expect(sameOriginPath('/\t/evil.example.com')).toBeUndefined();
    });

    it('NewlineBeforeTheAuthority_ReturnsUndefined', () => {
      expect(sameOriginPath('/\n/evil.example.com')).toBeUndefined();
      expect(sameOriginPath('/\r/evil.example.com')).toBeUndefined();
    });
  });

  describe('AcceptedInputs', () => {
    it('AppRelativePath_ReturnsValueUnchanged', () => {
      expect(sameOriginPath('/items?page=2&sort=name')).toBe(
        '/items?page=2&sort=name'
      );
    });

    it('ControlCharactersInsideThePath_AreStrippedRatherThanRejected', () => {
      expect(sameOriginPath('/items\t?page=2')).toBe('/items?page=2');
    });
  });
});
