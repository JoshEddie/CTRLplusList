/**
 * Pins `profiles-surface` — "A profile's space SHALL render an identity header
 * and a Settings form" (the manager's read-only view and the unwritten accent
 * suggestion).
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';
import type { ProfileCardView } from '@/lib/types';
import ProfileSettingsForm from '../ProfileSettingsForm';

const updateProfileSettings = vi.fn();
vi.mock('@/lib/data/profile.actions', () => ({
  updateProfileSettings: (...args: unknown[]) => updateProfileSettings(...args),
}));
vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

function makeProfile(
  overrides: Partial<ProfileCardView> = {}
): ProfileCardView {
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

const save = () => screen.queryByRole('button', { name: /save changes/i });

beforeEach(() => {
  vi.clearAllMocks();
  updateProfileSettings.mockResolvedValue({ success: true, message: 'Saved' });
});

describe('ProfileSettingsForm', () => {
  describe('IdentityHeader', () => {
    it('ProfileWithTagline_RendersNameInitialsAndTagline', () => {
      render(
        <ProfileSettingsForm
          profile={makeProfile({
            name: 'Ada Lovelace',
            tagline: 'Runs the household',
          })}
          suggestedAccent={ACCENT_NAMES[0]}
          readOnly={false}
        />
      );
      expect(
        screen.getByRole('heading', { name: 'Ada Lovelace' })
      ).toBeInTheDocument();
      expect(screen.getByText('AL')).toBeInTheDocument();
      expect(screen.getByText('Runs the household')).toBeInTheDocument();
    });

    it('ProfileWithoutTagline_RendersNoTaglineNode', () => {
      const { container } = render(
        <ProfileSettingsForm
          profile={makeProfile({ tagline: null })}
          suggestedAccent={ACCENT_NAMES[0]}
          readOnly={false}
        />
      );
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- the tagline node carries no role; asserting its ABSENCE needs the container.
      expect(container.querySelector('.profile-space-tagline')).toBeNull();
    });

    it('AccentPicked_RepaintsTheBandAndTheDiscBeforeAnySave', async () => {
      const user = userEvent.setup();
      const [first, second] = ACCENT_NAMES;
      const { container } = render(
        <ProfileSettingsForm
          profile={makeProfile()}
          suggestedAccent={first}
          readOnly={false}
        />
      );
      /* eslint-disable testing-library/no-container, testing-library/no-node-access -- the band is a decorative node carrying the accent's custom properties, reachable by neither role nor name. */
      const bandStyle = () =>
        container.querySelector('.profile-space-band')?.getAttribute('style') ??
        '';
      /* eslint-enable testing-library/no-container, testing-library/no-node-access */

      const before = bandStyle();
      await user.click(
        screen.getByRole('radio', { name: new RegExp(second, 'i') })
      );

      // The band carries both the strip's gradient and the disc's ink, so one
      // repaint moves every colour the header shows.
      expect(bandStyle()).not.toBe(before);
      expect(bandStyle()).toContain(
        `--accent-bg: linear-gradient(120deg, ${ACCENT_PRESETS[second].light}, ${ACCENT_PRESETS[second].dark})`
      );
      expect(bandStyle()).toContain(
        `--accent-ink: ${ACCENT_PRESETS[second].ink}`
      );
      expect(updateProfileSettings).not.toHaveBeenCalled();
    });
  });

  describe('Owner', () => {
    it('RoleOwner_RendersEditableFieldsAndSubmitControl', () => {
      render(
        <ProfileSettingsForm
          profile={makeProfile({ role: 'owner' })}
          suggestedAccent={ACCENT_NAMES[0]}
          readOnly={false}
        />
      );
      expect(screen.getByLabelText(/name/i)).toBeEnabled();
      expect(screen.getByLabelText(/tagline/i)).toBeEnabled();
      for (const swatch of screen.getAllByRole('radio')) {
        expect(swatch).toBeEnabled();
      }
      expect(save()).toBeInTheDocument();
    });

    it('SubmitEditedFields_SendsProfileIdWithNameTaglineAndAccent', async () => {
      render(
        <ProfileSettingsForm
          profile={makeProfile({ role: 'owner' })}
          suggestedAccent={ACCENT_NAMES[0]}
          readOnly={false}
        />
      );
      await userEvent.clear(screen.getByLabelText(/name/i));
      await userEvent.type(screen.getByLabelText(/name/i), 'Renamed');
      await userEvent.type(
        screen.getByLabelText(/tagline/i),
        'Loves dinosaurs'
      );
      await userEvent.click(save()!);

      await waitFor(() =>
        expect(updateProfileSettings).toHaveBeenCalledWith('p1', {
          name: 'Renamed',
          tagline: 'Loves dinosaurs',
          accent: ACCENT_NAMES[0],
        })
      );
    });
  });

  describe('Manager', () => {
    const renderAsManager = () =>
      render(
        <ProfileSettingsForm
          profile={makeProfile({ role: 'manager' })}
          suggestedAccent={ACCENT_NAMES[0]}
          readOnly
        />
      );

    it('RoleManager_DisablesEveryField', () => {
      renderAsManager();
      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByLabelText(/tagline/i)).toBeDisabled();
      for (const swatch of screen.getAllByRole('radio')) {
        expect(swatch).toBeDisabled();
      }
    });

    it('RoleManager_RendersNoSubmitControlAtAll', () => {
      renderAsManager();
      // Not a disabled one — the control is absent, so there is nothing to
      // click that could only fail.
      expect(save()).toBeNull();
      expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    });
  });

  describe('FailedSubmission', () => {
    it('ActionReturnsFailure_RendersMessageInline-KeepsFieldsEditable', async () => {
      updateProfileSettings.mockResolvedValue({
        success: false,
        message: 'Name is required',
      });
      render(
        <ProfileSettingsForm
          profile={makeProfile({ role: 'owner' })}
          suggestedAccent={ACCENT_NAMES[0]}
          readOnly={false}
        />
      );
      await userEvent.click(save()!);

      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeEnabled();
    });

    it('ActionReturnsFieldErrors_RendersThemOnTheirFields', async () => {
      updateProfileSettings.mockResolvedValue({
        success: false,
        message: 'Validation failed',
        errors: { tagline: ['Tagline must be 40 characters or less'] },
      });
      render(
        <ProfileSettingsForm
          profile={makeProfile({ role: 'owner' })}
          suggestedAccent={ACCENT_NAMES[0]}
          readOnly={false}
        />
      );
      await userEvent.click(save()!);

      expect(
        await screen.findByText('Tagline must be 40 characters or less')
      ).toBeInTheDocument();
    });
  });

  describe('UnsetAccent', () => {
    it('NoStoredAccent_SelectsSuggestedPresetWithoutWriting', () => {
      render(
        <ProfileSettingsForm
          profile={makeProfile({ accent: null })}
          suggestedAccent={ACCENT_NAMES[2]}
          readOnly={false}
        />
      );
      const checked = screen
        .getAllByRole('radio')
        .filter((s) => (s as HTMLInputElement).checked);
      expect(checked).toHaveLength(1);
      expect(checked[0]).toHaveAttribute('value', String(ACCENT_NAMES[2]));
      expect(updateProfileSettings).not.toHaveBeenCalled();
    });

    it('StoredAccent_SelectsTheStoredHue', () => {
      render(
        <ProfileSettingsForm
          profile={makeProfile({ accent: ACCENT_NAMES[4] })}
          suggestedAccent={ACCENT_NAMES[4]}
          readOnly={false}
        />
      );
      const checked = screen
        .getAllByRole('radio')
        .find((s) => (s as HTMLInputElement).checked);
      expect(checked).toHaveAttribute('value', String(ACCENT_NAMES[4]));
    });
  });
});
