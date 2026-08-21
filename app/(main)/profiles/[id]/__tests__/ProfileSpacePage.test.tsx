/**
 * Pins `profiles-surface` — "A profile's space SHALL be reachable only by that
 * profile's members" and "SHALL render an identity header and a Settings form".
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES } from '@/lib/accent';
import { getProfileMembership } from '@/lib/data/profile';
import type { ProfileCardView } from '@/lib/types';
import { authedUserId } from '@/lib/data/user.session';
import ProfileSpacePage from '../ProfileSpacePage';

vi.mock('@/lib/data/profile', () => ({ getProfileMembership: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedUserId: vi.fn() }));
vi.mock('../../ui/components/ProfileSettingsForm', () => ({
  default: ({
    readOnly,
    suggestedAccent,
  }: {
    readOnly: boolean;
    suggestedAccent: string;
  }) => (
    <div
      data-testid="settings-form"
      data-readonly={String(readOnly)}
      data-suggested={suggestedAccent}
    />
  ),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

function card(overrides: Partial<ProfileCardView> = {}): ProfileCardView {
  return {
    id: 'p1',
    name: 'Kiddo',
    tagline: null,
    role: 'owner',
    listCount: 0,
    itemCount: 0,
    accent: null,
    ...overrides,
  };
}

const form = () => screen.getByTestId('settings-form');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedUserId).mockResolvedValue('viewer');
  vi.mocked(getProfileMembership).mockResolvedValue(card());
});

describe('ProfileSpacePage', () => {
  describe('Access', () => {
    it('NoSession_RedirectsToRoot', async () => {
      vi.mocked(authedUserId).mockResolvedValue(null);
      await expect(
        ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) })
      ).rejects.toThrow('REDIRECT:/');
      expect(getProfileMembership).not.toHaveBeenCalled();
    });

    it('NonMember_RedirectsToProfiles', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(null);
      await expect(
        ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) })
      ).rejects.toThrow('REDIRECT:/profiles');
    });
  });

  describe('SettingsForm', () => {
    it('RoleManager_PassesReadOnly', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(
        card({ role: 'manager' })
      );
      render(await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) }));
      expect(form()).toHaveAttribute('data-readonly', 'true');
    });

    it.each(['self', 'owner'] as const)(
      'Role%s_PassesEditable',
      async (role) => {
        vi.mocked(getProfileMembership).mockResolvedValue(card({ role }));
        render(
          await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) })
        );
        expect(form()).toHaveAttribute('data-readonly', 'false');
      }
    );

    it('StoredAccent_SuggestsThatPreset', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(
        card({ accent: ACCENT_NAMES[3] })
      );
      render(await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) }));
      expect(form()).toHaveAttribute('data-suggested', ACCENT_NAMES[3]);
    });

    it('NoStoredAccent_SuggestsAPresetWithoutWriting', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(card({ accent: null }));
      render(await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) }));
      const suggested = form().getAttribute('data-suggested') ?? '';
      expect(ACCENT_NAMES).toContain(suggested);
    });
  });
});
