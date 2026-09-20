import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  itemRowTags,
  profileIdentityTags,
  updateTags,
} from '@/lib/cacheTags';
import { updateTag } from 'next/cache';

vi.mock('next/cache', () => ({ updateTag: vi.fn() }));

beforeEach(() => {
  vi.mocked(updateTag).mockClear();
});

describe('updateTags', () => {
  it('MultipleTags_FiresUpdateTagOncePerTagInOrder', () => {
    updateTags('lists:id:L1', 'lists:profile:P1');
    expect(vi.mocked(updateTag).mock.calls).toEqual([
      ['lists:id:L1'],
      ['lists:profile:P1'],
    ]);
  });
});

describe('profileIdentityTags', () => {
  it('OneProfile_CoversItsRowItsArtAndItsAccent', () => {
    // A face is three rows in three tables; a read naming two of them keeps
    // painting the old identity when the third changes.
    expect(profileIdentityTags(['p1'])).toEqual([
      'profiles:id:p1',
      'profile_avatars:profile:p1',
      'profile_preferences:profile:p1',
    ]);
  });

  it('RepeatedProfile_EmitsEachTagOnce', () => {
    expect(profileIdentityTags(['p1', 'p1'])).toEqual(
      profileIdentityTags(['p1'])
    );
  });

  it('NoProfiles_ReturnsNoTags', () => {
    expect(profileIdentityTags([])).toEqual([]);
  });
});

describe('itemRowTags', () => {
  it('RowsWithPurchaseAttributions_ReturnsOwnerAndAttributionProfileTags', () => {
    const tags = itemRowTags([
      {
        profile_id: 'p-owner',
        purchases: [
          { profile_id: 'p-buyer', claimed_by_profile_id: 'p-claimer' },
        ],
      },
    ]);
    expect(tags).toEqual([
      'items:profile:p-owner',
      ...profileIdentityTags(['p-buyer', 'p-claimer']),
    ]);
  });

  it('GuestAttributions_SkipsNullProfileIds', () => {
    const tags = itemRowTags([
      {
        profile_id: 'p-owner',
        purchases: [{ profile_id: null, claimed_by_profile_id: null }],
      },
    ]);
    expect(tags).toEqual(['items:profile:p-owner']);
  });

  it('RowsSharingOwnerAndAttribution_DeduplicatesTags', () => {
    const tags = itemRowTags([
      {
        profile_id: 'p-owner',
        purchases: [
          { profile_id: 'p-owner', claimed_by_profile_id: 'p-buyer' },
        ],
      },
      {
        profile_id: 'p-owner',
        purchases: [
          { profile_id: 'p-buyer', claimed_by_profile_id: 'p-buyer' },
        ],
      },
    ]);
    expect(tags).toEqual([
      'items:profile:p-owner',
      ...profileIdentityTags(['p-owner', 'p-buyer']),
    ]);
  });

  it('RowsWithoutPurchases_ReturnsOwnerTagsOnly', () => {
    const tags = itemRowTags([{ profile_id: 'p-a' }, { profile_id: 'p-b' }]);
    expect(tags).toEqual([
      'items:profile:p-a',
      'items:profile:p-b',
    ]);
  });

  it('NoRows_ReturnsNoTags', () => {
    expect(itemRowTags([])).toEqual([]);
  });
});
