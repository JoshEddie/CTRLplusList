/**
 * Pins `profiles-surface` — claim visibility is gated **per control**, not per
 * panel: a member's own baseline is theirs whatever their role, while the
 * profile-level default and every other member's baseline take the `owner`
 * floor and render disabled rather than absent
 * (`2026-08-30-a-forbidden-affordance-renders-disabled`).
 *
 * The viewer's own baseline is the one control they came for, so it renders
 * open; the rows they merely administer collapse, since a profile with several
 * members would otherwise be a wall of identical control sets.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES } from '@/lib/data/profile.roles';
import type { ProfileMemberRow } from '@/lib/data/profile.members';
import {
  setMemberTier,
  setProfileSpoilerDefault,
} from '@/lib/data/profile.spoilers.actions';
import { PROTECTED_TIER } from '@/lib/spoilers';
import ClaimVisibilitySection from '../ClaimVisibilitySection';

vi.mock('@/lib/data/profile.spoilers.actions', () => ({
  setMemberTier: vi.fn(),
  setProfileSpoilerDefault: vi.fn(),
}));
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const VIEWER = 'viewer-account';
const OTHER = 'other-account';

const member = (
  user_id: string,
  name: string,
  baseline = PROTECTED_TIER
): ProfileMemberRow => ({
  user_id,
  role: ROLES.manager,
  last_active_at: null,
  baseline,
  id: `self-${user_id}`,
  name,
  accent: null,
  art: null,
  avatarStyle: null,
});

const MEMBERS = [member(VIEWER, 'Vic'), member(OTHER, 'Ollie')];

const OWN = 'What you see on this profile';
const OTHERS = 'Claim visibility for Ollie';
const DEFAULT = 'Default for new members';

const renderSection = (viewerIsOwner: boolean, members = MEMBERS) =>
  render(
    <ClaimVisibilitySection
      profileId="kiddo"
      members={members}
      profileDefault={PROTECTED_TIER}
      viewerUserId={VIEWER}
      viewerIsOwner={viewerIsOwner}
    />
  );

const tierControl = (name: string) =>
  screen.getByRole('combobox', { name }) as HTMLSelectElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(setMemberTier).mockResolvedValue({
    success: true,
    message: 'Claim visibility updated',
  });
  vi.mocked(setProfileSpoilerDefault).mockResolvedValue({
    success: true,
    message: 'Default claim visibility updated',
  });
});

describe('ClaimVisibilitySection', () => {
  describe('OwnBaseline', () => {
    it('Render_IsOpenWithoutBeingExpanded', () => {
      renderSection(false);
      expect(tierControl(OWN)).toBeInTheDocument();
    });

    it('ManagerRole_RendersEnabled', () => {
      renderSection(false);
      expect(tierControl(OWN)).toBeEnabled();
    });

    it('ChangeTheTier_DispatchesSetMemberTierForTheViewer', async () => {
      const user = userEvent.setup();
      renderSection(false);
      await user.selectOptions(tierControl(OWN), 'claims');

      expect(setMemberTier).toHaveBeenCalledWith('kiddo', VIEWER, 'claims');
    });

    it('ViewerHoldsNoMembership_RendersNoOwnControl', () => {
      renderSection(true, [member(OTHER, 'Ollie')]);
      expect(
        screen.queryByRole('combobox', { name: OWN })
      ).not.toBeInTheDocument();
    });
  });

  describe('AdministeredRows', () => {
    it('Render_AreCollapsedWithTheirTierAsTheSummary', () => {
      renderSection(true);

      expect(
        screen.queryByRole('combobox', { name: OTHERS })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^Ollie/ })
      ).toHaveTextContent('Surprise me');
    });

    it('TriggerActivated_RevealsThatRowsControlAlone', async () => {
      const user = userEvent.setup();
      renderSection(true);
      await user.click(screen.getByRole('button', { name: /^Ollie/ }));

      expect(tierControl(OTHERS)).toBeInTheDocument();
      expect(
        screen.queryByRole('combobox', { name: DEFAULT })
      ).not.toBeInTheDocument();
    });

    it('TriggerActivatedTwice_CollapsesAgain', async () => {
      const user = userEvent.setup();
      renderSection(true);
      const trigger = screen.getByRole('button', { name: /^Ollie/ });
      await user.click(trigger);
      await user.click(trigger);

      expect(
        screen.queryByRole('combobox', { name: OTHERS })
      ).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Manager', () => {
    it('AnothersBaseline_RendersPresentAndDisabled', async () => {
      const user = userEvent.setup();
      renderSection(false);
      await user.click(screen.getByRole('button', { name: /^Ollie/ }));

      expect(tierControl(OTHERS)).toBeDisabled();
    });

    it('ProfileDefault_RendersPresentAndDisabled', async () => {
      const user = userEvent.setup();
      renderSection(false);
      await user.click(
        screen.getByRole('button', { name: new RegExp(DEFAULT) })
      );

      expect(tierControl(DEFAULT)).toBeDisabled();
    });
  });

  describe('Owner', () => {
    it('ChangeAnothersTier_DispatchesSetMemberTierForThatMember', async () => {
      const user = userEvent.setup();
      renderSection(true);
      await user.click(screen.getByRole('button', { name: /^Ollie/ }));
      await user.selectOptions(tierControl(OTHERS), 'claims');

      expect(setMemberTier).toHaveBeenCalledWith('kiddo', OTHER, 'claims');
    });

    it('ChangeTheDefault_DispatchesSetProfileSpoilerDefault', async () => {
      const user = userEvent.setup();
      renderSection(true);
      await user.click(
        screen.getByRole('button', { name: new RegExp(DEFAULT) })
      );
      await user.selectOptions(tierControl(DEFAULT), 'claims');

      expect(setProfileSpoilerDefault).toHaveBeenCalledWith('kiddo', 'claims');
      expect(setMemberTier).not.toHaveBeenCalled();
    });
  });

  describe('StoredValues', () => {
    // Changing the default moves nobody, so the panel must render each
    // member's own stored value rather than the default projected onto them.
    it('MemberAboveTheDefault_SummarisesTheirOwnStoredTier', () => {
      renderSection(true, [
        member(VIEWER, 'Vic'),
        member(OTHER, 'Ollie', 'claims'),
      ]);

      expect(
        screen.getByRole('button', { name: /^Ollie/ })
      ).toHaveTextContent('Claims shown');
      expect(
        screen.getByRole('button', { name: new RegExp(DEFAULT) })
      ).toHaveTextContent('Surprise me');
    });
  });

  describe('RefusedWrite', () => {
    it('ActionRefuses_RestoresThePreviousValue', async () => {
      vi.mocked(setMemberTier).mockResolvedValue({
        success: false,
        message: 'Forbidden',
        error: 'Forbidden',
      });
      const user = userEvent.setup();
      renderSection(true);
      await user.click(screen.getByRole('button', { name: /^Ollie/ }));
      await user.selectOptions(tierControl(OTHERS), 'claims');

      expect(tierControl(OTHERS).value).toBe('surprise');
      expect(refresh).not.toHaveBeenCalled();
    });
  });
});
