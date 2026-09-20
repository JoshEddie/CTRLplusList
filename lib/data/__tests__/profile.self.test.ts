import { describe, expect, it } from 'vitest';

import { SELF_MEMBERSHIP_PER_USER_IDX } from '@/db/schema';
import { createSelfProfile } from '@/lib/data/profile.self';

describe('createSelfProfile', () => {
  // The membership insert has no ON CONFLICT: losing the self-role race raises
  // 23505 and rolls the profile insert back with it, and swallowing exactly
  // that violation is what makes creation idempotent.
  function throwingDb(cause: { code: string; constraint: string }) {
    return {
      $with: () => ({ as: () => ({ id: 'created.id' }) }),
      insert: () => ({ values: () => ({ returning: () => ({}) }) }),
      select: () => ({ from: () => ({}) }),
      with: () => ({
        insert: () => ({
          select: () =>
            Promise.reject(Object.assign(new Error('Failed query'), { cause })),
        }),
      }),
    };
  }

  it('SelfMembershipUniqueViolation_ResolvesWithNullId', async () => {
    await expect(
      createSelfProfile(
        throwingDb({
          code: '23505',
          constraint: SELF_MEMBERSHIP_PER_USER_IDX,
        }) as never,
        'u1',
        'Ada'
      )
    ).resolves.toBeNull();
  });

  it('UnrelatedUniqueViolation_Rethrows', async () => {
    await expect(
      createSelfProfile(
        throwingDb({ code: '23505', constraint: 'some_other_idx' }) as never,
        'u1',
        'Ada'
      )
    ).rejects.toThrow('Failed query');
  });
});
