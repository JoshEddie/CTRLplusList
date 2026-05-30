import { describe, expect, it } from 'vitest';

import { capRail } from '../utils';

describe('capRail', () => {
  it('EmptyArray_ReturnsEmptyShownZeroMore', () => {
    expect(capRail([])).toEqual({ shown: [], moreCount: 0 });
  });

  it('BelowLimit_ReturnsAllShownZeroMore', () => {
    const { shown, moreCount } = capRail([1, 2, 3]);
    expect(shown).toEqual([1, 2, 3]);
    expect(moreCount).toBe(0);
  });

  it('AtLimit_ReturnsAllShownZeroMore', () => {
    const { shown, moreCount } = capRail([1, 2, 3, 4, 5]);
    expect(shown).toEqual([1, 2, 3, 4, 5]);
    expect(moreCount).toBe(0);
  });

  it('AboveLimit_CapsShownAndCountsRemainder', () => {
    const input = Array.from({ length: 17 }, (_, i) => i);
    const { shown, moreCount } = capRail(input);
    expect(shown).toEqual([0, 1, 2, 3, 4]);
    expect(moreCount).toBe(12);
  });

  it('CustomLimit_RespectsLimitArg', () => {
    const input = Array.from({ length: 10 }, (_, i) => i);
    const { shown, moreCount } = capRail(input, 3);
    expect(shown).toEqual([0, 1, 2]);
    expect(moreCount).toBe(7);
  });
});
