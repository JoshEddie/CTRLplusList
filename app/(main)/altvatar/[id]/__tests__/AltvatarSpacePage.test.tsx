/**
 * Pins `profiles-surface` — a member's space "SHALL render an identity header
 * and a Settings form", and the branch that hands every other viewer the
 * public view instead.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES } from '@/lib/accent';
import type { AltvatarDraft } from '@/app/ui/components/altvatar/AltvatarCustomizer';
import { getProfileMembership } from '@/lib/data/profile';
import { getAltvatarOptions } from '@/lib/data/profileAvatar';
import { writeAltvatar } from '@/lib/data/profileAvatar.write';
import { kindOf } from '@/lib/altvatar/registry';
import {
  ALTVATAR_STYLE_IDS,
  type AltvatarStyleId,
} from '@/lib/altvatar/types';
import type { ProfileCardView } from '@/lib/types';
import { authedIdentity } from '@/lib/data/user.session';
import { makeIdentity, makeProfile } from '@/test/helpers/profile';
import AltvatarSpacePage from '../AltvatarSpacePage';

vi.mock('@/lib/data/profile', () => ({ getProfileMembership: vi.fn() }));
vi.mock('@/lib/data/profileAvatar', () => ({ getAltvatarOptions: vi.fn() }));
vi.mock('@/lib/data/profileAvatar.write', () => ({ writeAltvatar: vi.fn() }));
vi.mock('@/lib/data/user.session', () => ({ authedIdentity: vi.fn() }));
// The Permissions section and the invite control are imported by this page, and
// both reach `@/db` — the section through its roster read, the control through
// the actions module a client component pulls in. Mocked at those seams so the
// page's module graph stays free of a database binding this suite never sets.
vi.mock('@/lib/data/profile.members', () => ({
  getProfileMembers: vi.fn(async () => []),
  getPendingInvites: vi.fn(async () => []),
}));
vi.mock('@/lib/data/list', () => ({ getListsByProfile: vi.fn(async () => []) }));
vi.mock('@/lib/data/profile.members.actions', () => ({
  mintInvite: vi.fn(),
  setMemberRole: vi.fn(),
  removeMember: vi.fn(),
  revokeInvite: vi.fn(),
  setInviteRole: vi.fn(),
}));
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

vi.mock('../ProfilePage', () => ({
  default: () => <div data-testid="public-view" />,
}));

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

const renderSpace = async () =>
  render(
    await AltvatarSpacePage({
      params: Promise.resolve({ id: 'p1' }),
      searchParams: Promise.resolve({}),
    })
  );

const form = () => screen.getByTestId('settings-form');
const draftOf = () => {
  const raw = form().getAttribute('data-draft');
  return raw ? (JSON.parse(raw) as AltvatarDraft) : null;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedIdentity).mockResolvedValue(
    makeIdentity('viewer', makeProfile('self-viewer', 'Test Viewer'))
  );
  vi.mocked(getAltvatarOptions).mockResolvedValue(null);
  vi.mocked(getProfileMembership).mockResolvedValue(card());
});

describe('AltvatarSpacePage', () => {
  describe('Audience', () => {
    it('NoSession_RendersPublicViewWithoutAskingForMembership', async () => {
      vi.mocked(authedIdentity).mockResolvedValue(null);
      await renderSpace();
      expect(screen.getByTestId('public-view')).toBeInTheDocument();
      expect(getProfileMembership).not.toHaveBeenCalled();
    });

    it('NonMember_RendersPublicView', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(null);
      await renderSpace();
      expect(screen.getByTestId('public-view')).toBeInTheDocument();
      expect(screen.queryByTestId('settings-form')).not.toBeInTheDocument();
    });

    it('Member_RendersSettingsForm', async () => {
      await renderSpace();
      expect(form()).toBeInTheDocument();
      expect(screen.queryByTestId('public-view')).not.toBeInTheDocument();
    });
  });

  describe('SettingsForm', () => {
    it('RoleManager_PassesReadOnly', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(
        card({ role: 'manager' })
      );
      await renderSpace();
      expect(form()).toHaveAttribute('data-readonly', 'true');
    });

    it.each(['self', 'owner'] as const)(
      'Role%s_PassesEditable',
      async (role) => {
        vi.mocked(getProfileMembership).mockResolvedValue(card({ role }));
        await renderSpace();
        expect(form()).toHaveAttribute('data-readonly', 'false');
      }
    );

    it('RoleManager_PassesNoDraft', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(
        card({ role: 'manager' })
      );
      await renderSpace();
      expect(draftOf()).toBeNull();
      // Nothing is rolled for a viewer who has no way to save it.
      expect(getAltvatarOptions).not.toHaveBeenCalled();
    });

    it('StoredAccent_SuggestsThatPreset', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(
        card({ accent: ACCENT_NAMES[3] })
      );
      await renderSpace();
      expect(draftOf()?.accent).toBe(ACCENT_NAMES[3]);
    });

    it('NoStoredAccent_SuggestsAPresetWithoutWriting', async () => {
      vi.mocked(getProfileMembership).mockResolvedValue(card({ accent: null }));
      await renderSpace();
      expect(ACCENT_NAMES).toContain(draftOf()?.accent);
    });

    it('StoredAltvatar_OpensOnItRatherThanARoll', async () => {
      vi.mocked(getAltvatarOptions).mockResolvedValue({
        style: 'toon-head',
        options: { seed: 'kiddo', selections: { glyph: 'cat' } },
      });
      await renderSpace();
      expect(draftOf()).toMatchObject({
        style: 'toon-head',
        options: { seed: 'kiddo', selections: { glyph: 'cat' } },
      });
    });

    it('NoStoredAltvatar_RollsARollableStyleWithoutWriting', async () => {
      await renderSpace();
      const style = draftOf()?.style as AltvatarStyleId;

      expect(ALTVATAR_STYLE_IDS).toContain(style);
      // A thing answers a different question — a household, not a face —
      // so it is reachable in the chooser but never rolled into.
      expect(kindOf(style)).toBe('person');
      expect(draftOf()?.options.seed).toBeTruthy();
      expect(writeAltvatar).not.toHaveBeenCalled();
    });
  });
});
