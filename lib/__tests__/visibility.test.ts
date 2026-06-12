import { describe, expect, it } from 'vitest';
import type { ListTable } from '@/lib/types';
import {
  VISIBILITY,
  fromDb,
  resolveListVisibility,
  visibilityDbValues,
} from '../visibility';

function listRow(overrides: Partial<ListTable & { visibility?: string }> = {}) {
  return {
    id: 'l1',
    name: 'L',
    subtitle: null,
    occasion: '',
    date: new Date(0),
    created_at: new Date(0),
    updated_at: new Date(0),
    user_id: 'u1',
    shared: false,
    ...overrides,
  };
}

describe('visibility', () => {
  describe('fromDb', () => {
    describe('LegacyDbStrings', () => {
      it('InputPrivate_ReturnsOWNER', () => {
        expect(fromDb('private')).toBe(VISIBILITY.OWNER);
      });
      it('InputUnlisted_ReturnsLINK', () => {
        expect(fromDb('unlisted')).toBe(VISIBILITY.LINK);
      });
      it('InputPublic_ReturnsFOLLOWERS', () => {
        expect(fromDb('public')).toBe(VISIBILITY.FOLLOWERS);
      });
    });

    // These are Stage-1 dead code (see visibility.ts file header). Tests must
    // remain covered so the Stage-2 string flip ships without surprises.
    describe('FutureCanonicalStrings', () => {
      it('InputOwner_ReturnsOWNER', () => {
        expect(fromDb('owner')).toBe(VISIBILITY.OWNER);
      });
      it('InputLink_ReturnsLINK', () => {
        expect(fromDb('link')).toBe(VISIBILITY.LINK);
      });
      it('InputFollowers_ReturnsFOLLOWERS', () => {
        expect(fromDb('followers')).toBe(VISIBILITY.FOLLOWERS);
      });
    });

    describe('UnknownInputs', () => {
      it('UnknownInput_ThrowsUnknownVisibilityValueErrorWithJsonStringifiedValue', () => {
        expect(() => fromDb('garbage')).toThrow(/Unknown list visibility value/);
        expect(() => fromDb('garbage')).toThrow(/"garbage"/);
      });
      it('EmptyString_ThrowsUnknownVisibilityValueErrorWithJsonStringifiedValue', () => {
        expect(() => fromDb('')).toThrow(/Unknown list visibility value/);
        expect(() => fromDb('')).toThrow(/""/);
      });
      it('UppercasePrivate_ThrowsUnknownVisibilityValueError', () => {
        expect(() => fromDb('PRIVATE')).toThrow(/Unknown list visibility value/);
        expect(() => fromDb('PRIVATE')).toThrow(/"PRIVATE"/);
      });
    });
  });

  describe('visibilityDbValues', () => {
    it('OwnerSingleton_ExpandsToPrivateThenOwnerInInsertionOrder', () => {
      expect(visibilityDbValues([VISIBILITY.OWNER])).toEqual(['private', 'owner']);
    });

    it('LinkAndFollowers_ExpandsToAllFourLegacyAndCanonicalStrings', () => {
      expect(visibilityDbValues([VISIBILITY.LINK, VISIBILITY.FOLLOWERS])).toEqual([
        'unlisted',
        'link',
        'public',
        'followers',
      ]);
    });

    it('EmptyInput_ReturnsEmptyArray', () => {
      expect(visibilityDbValues([])).toEqual([]);
    });

    // Intentional contract: function does NOT dedupe; downstream `inArray` is
    // dedup-tolerant. Asserting current behavior so a future implicit-dedupe
    // change is a deliberate spec event, not a silent regression.
    it('DuplicateOwnerInput_PreservesDuplicatesVerbatim', () => {
      expect(visibilityDbValues([VISIBILITY.OWNER, VISIBILITY.OWNER])).toEqual([
        'private',
        'owner',
        'private',
        'owner',
      ]);
    });
  });

  describe('resolveListVisibility', () => {
    it('ExplicitVisibilityColumn_DecodesViaFromDb', () => {
      expect(resolveListVisibility(listRow({ visibility: 'unlisted' }))).toBe(
        VISIBILITY.LINK
      );
    });

    it('NoVisibilitySharedTrue_ReturnsLINK', () => {
      expect(resolveListVisibility(listRow({ shared: true }))).toBe(
        VISIBILITY.LINK
      );
    });

    it('NoVisibilitySharedFalse_ReturnsOWNER', () => {
      expect(resolveListVisibility(listRow({ shared: false }))).toBe(
        VISIBILITY.OWNER
      );
    });

    it('ColumnSetSharedTrue_DecodesColumnIgnoringShared', () => {
      expect(
        resolveListVisibility(listRow({ visibility: 'private', shared: true }))
      ).toBe(VISIBILITY.OWNER);
    });
  });
});
