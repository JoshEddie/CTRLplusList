/**
 * Pins `profiles-surface` — "A profile's space SHALL be reachable only by that
 * profile's members" and "SHALL render an identity header and a Settings form".
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES } from '@/lib/accent';
import type { AltvatarDraft } from '@/app/ui/components/altvatar/AltvatarCustomizer';
import { getProfileMembership } from '@/lib/data/profile';
import { getAltvatarOptions } from '@/lib/data/profileAvatar';
import { writeAltvatar } from '@/lib/data/profileAvatar.write';
import { ALTVATAR_STYLES } from '@/lib/altvatar/registry';
import {
  ALTVATAR_STYLE_IDS,
  type AltvatarStyleId,
} from '@/lib/altvatar/types';
import type { ProfileCardView } from '@/lib/types';
import { authedUserId } from '@/lib/data/user.session';
import ProfileSpacePage from '../ProfileSpacePage';

vi.mock('@/lib/data/profile', () => ({ getProfileMembership: vi.fn() }));
vi.mock('@/lib/data/profileAvatar', () => ({ getAltvatarOptions: vi.fn() }));
vi.mock('@/lib/data/profileAvatar.write', () => ({ writeAltvatar: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedUserId: vi.fn() }));
vi.mock('../../ui/components/ProfileSettingsForm', () => ({
  default: ({
    readOnly,
    draft,
  }: {
    readOnly: boolean;
    draft: AltvatarDraft | null;
  }) => (
    <div
      data-testid="settings-form"
      data-readonly={String(readOnly)}
      data-draft={draft ? JSON.stringify(draft) : ''}
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
    art: null,
    avatarStyle: null,
    ...overrides,
  };
}

const form = () => screen.getByTestId('settings-form');
const draftOf = () => {
  const raw = form().getAttribute('data-draft');
  return raw ? (JSON.parse(raw) as AltvatarDraft) : null;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedUserId).mockResolvedValue('viewer');
  vi.mocked(getAltvatarOptions).mockResolvedValue(null);
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

    it('RoleManager_PassesNoDraft', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(
        card({ role: 'manager' })
      );
      render(await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) }));
      expect(draftOf()).toBeNull();
      // Nothing is rolled for a viewer who has no way to save it.
      expect(getAltvatarOptions).not.toHaveBeenCalled();
    });

    it('StoredAccent_SuggestsThatPreset', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(
        card({ accent: ACCENT_NAMES[3] })
      );
      render(await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) }));
      expect(draftOf()?.accent).toBe(ACCENT_NAMES[3]);
    });

    it('NoStoredAccent_SuggestsAPresetWithoutWriting', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(card({ accent: null }));
      render(await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) }));
      expect(ACCENT_NAMES).toContain(draftOf()?.accent);
    });

    it('StoredAltvatar_OpensOnItRatherThanARoll', async () => {
      vi.mocked(getAltvatarOptions).mockResolvedValue({
        style: 'icons',
        options: { seed: 'kiddo', selections: { glyph: 'cat' } },
      });
      render(await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) }));
      expect(draftOf()).toMatchObject({
        style: 'icons',
        options: { seed: 'kiddo', selections: { glyph: 'cat' } },
      });
    });

    it('NoStoredAltvatar_RollsARollableStyleWithoutWriting', async () => {
      render(await ProfileSpacePage({ params: Promise.resolve({ id: 'p1' }) }));
      const style = draftOf()?.style as AltvatarStyleId;

      expect(ALTVATAR_STYLE_IDS).toContain(style);
      // A glyph style answers a different question — a household, not a face —
      // so it is reachable in the chooser but never rolled into.
      expect(ALTVATAR_STYLES[style].glyph).toBeFalsy();
      expect(draftOf()?.options.seed).toBeTruthy();
      expect(writeAltvatar).not.toHaveBeenCalled();
    });
  });
});
