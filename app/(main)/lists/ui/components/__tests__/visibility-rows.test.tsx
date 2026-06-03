import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import { VISIBILITY, type ListVisibility } from '@/lib/visibility';
import { VISIBILITY_ROWS, rowFor } from '../visibility-rows';

describe('visibilityRows', () => {
  describe('VISIBILITY_ROWS', () => {
    it('Table_HasThreeRowsInSourceOrder', () => {
      expect(VISIBILITY_ROWS.map((r) => r.value)).toEqual([
        VISIBILITY.OWNER,
        VISIBILITY.LINK,
        VISIBILITY.FOLLOWERS,
      ]);
      expect(VISIBILITY_ROWS.map((r) => r.label)).toEqual([
        'Hidden',
        'Private',
        'Shared',
      ]);
    });

    it('EachRow_HasExpectedLabelDescriptionToast-ValidIconElement', () => {
      expect(VISIBILITY_ROWS).toEqual([
        expect.objectContaining({
          value: VISIBILITY.OWNER,
          label: 'Hidden',
          description: 'Only you can see this list',
          toast: 'List is now hidden',
        }),
        expect.objectContaining({
          value: VISIBILITY.LINK,
          label: 'Private',
          description: 'Only people with the link can view',
          toast: 'Only people with the link can view',
        }),
        expect.objectContaining({
          value: VISIBILITY.FOLLOWERS,
          label: 'Shared',
          description:
            'Anyone with the link — plus your followers see it in their feed',
          toast: 'Shared — your followers can now find it',
        }),
      ]);
      for (const row of VISIBILITY_ROWS) {
        expect(isValidElement(row.icon)).toBe(true);
      }
    });

    it('Values_AreThreeDistinctVisibilities', () => {
      const values = VISIBILITY_ROWS.map((r) => r.value);
      expect(new Set(values)).toEqual(
        new Set([VISIBILITY.OWNER, VISIBILITY.LINK, VISIBILITY.FOLLOWERS])
      );
      expect(values).toHaveLength(3);
    });
  });

  describe('rowFor', () => {
    it('KnownValue_ReturnsMatchingRow', () => {
      expect(rowFor(VISIBILITY.OWNER).label).toBe('Hidden');
      expect(rowFor(VISIBILITY.LINK).label).toBe('Private');
      expect(rowFor(VISIBILITY.FOLLOWERS).label).toBe('Shared');
    });

    it('UnknownValue_ReturnsFirstRow', () => {
      expect(rowFor('bogus' as ListVisibility)).toBe(VISIBILITY_ROWS[0]);
    });
  });
});
