/**
 * Pins `profiles-surface` — "A profile's space SHALL render an identity header
 * and a Settings form" (the manager's read-only view and the unwritten
 * Altvatar suggestion) — and `active-profile` — "A switch that would discard
 * unsaved edits SHALL be confirmed first", from the form's side of that wiring.
 */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProfileSwitch } from '@/test/helpers/profile-switch';

import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';
import type { AltvatarDraft } from '@/app/ui/components/altvatar/AltvatarCustomizer';
import type { ProfileCardView } from '@/lib/types';
import { useProfileSwitch } from '@/app/ui/components/ProfileSwitchProvider';
import ProfileSettingsForm from '../ProfileSettingsForm';

const updateProfileSettings = vi.fn();
const updateProfileIdentity = vi.fn();
const switchActiveProfile = vi.fn();
vi.mock('@/lib/data/profile.actions', () => ({
  updateProfileSettings: (...args: unknown[]) => updateProfileSettings(...args),
  updateProfileIdentity: (...args: unknown[]) => updateProfileIdentity(...args),
  switchActiveProfile: (...args: unknown[]) => switchActiveProfile(...args),
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
    art: null,
    avatarStyle: null,
    ...overrides,
  };
}

// Selections only — the rendering is the server's, so a draft never carries
// one. `icons` keeps the customizer's option panel to a single axis.
function makeDraft(overrides: Partial<AltvatarDraft> = {}): AltvatarDraft {
  return {
    style: 'icons',
    options: { seed: 'kiddo', selections: {} },
    accent: ACCENT_NAMES[0],
    ...overrides,
  };
}

const save = () => screen.queryByRole('button', { name: /save changes/i });
const editAltvatar = () =>
  screen.queryByRole('button', { name: /edit altvatar/i });

const renderForm = (
  profile: ProfileCardView = makeProfile(),
  draft: AltvatarDraft | null = makeDraft(),
  readOnly = false
) =>
  renderWithProfileSwitch(
    <ProfileSettingsForm
      profile={profile}
      draft={draft}
      readOnly={readOnly}
    />
  );

// The switch is raised from the nav, a different subtree, so the guard is
// only observable with something that switches rendered alongside the form.
function Switcher() {
  const switchProfile = useProfileSwitch();
  return (
    <button type="button" onClick={() => switchProfile('p2')}>
      Switch
    </button>
  );
}

const renderWithSwitcher = () =>
  renderWithProfileSwitch(
    <>
      <ProfileSettingsForm
        profile={makeProfile()}
        draft={makeDraft()}
        readOnly={false}
      />
      <Switcher />
    </>
  );

const switchButton = () => screen.getByRole('button', { name: 'Switch' });
const prompt = () => screen.queryByText('You have unsaved changes');

beforeEach(() => {
  vi.clearAllMocks();
  updateProfileSettings.mockResolvedValue({ success: true, message: 'Saved' });
  updateProfileIdentity.mockResolvedValue({
    success: true,
    message: 'Altvatar saved',
  });
  switchActiveProfile.mockResolvedValue({ success: true, message: 'Switched' });
});

describe('ProfileSettingsForm', () => {
  describe('IdentityHeader', () => {
    it('ProfileWithTagline_RendersNameAndTagline', () => {
      renderForm(
        makeProfile({ name: 'Ada Lovelace', tagline: 'Runs the household' })
      );
      expect(
        screen.getByRole('heading', { name: 'Ada Lovelace' })
      ).toBeInTheDocument();
      expect(screen.getByText('Runs the household')).toBeInTheDocument();
    });

    it('ProfileWithoutTagline_RendersNoTaglineNode', () => {
      const { container } = renderForm(makeProfile({ tagline: null }));
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- the tagline node carries no role; asserting its ABSENCE needs the container.
      expect(container.querySelector('.profile-space-tagline')).toBeNull();
    });

    it('AltvatarConfirmed_RepaintsTheBandAndSavesImmediately', async () => {
      const user = userEvent.setup();
      const [first, second] = ACCENT_NAMES;
      const { container } = renderForm(
        makeProfile(),
        makeDraft({ accent: first })
      );
      /* eslint-disable testing-library/no-container, testing-library/no-node-access -- the band is a decorative node carrying the accent's custom properties, reachable by neither role nor name. */
      const bandStyle = () =>
        container.querySelector('.profile-space-band')?.getAttribute('style') ??
        '';
      /* eslint-enable testing-library/no-container, testing-library/no-node-access */

      const before = bandStyle();
      await user.click(editAltvatar()!);
      await user.click(
        screen.getByRole('radio', { name: new RegExp(second, 'i') })
      );
      await user.click(
        screen.getByRole('button', { name: /use this altvatar/i })
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
      // Confirming is the commit: the viewer who leaves the page now leaves a
      // decision that stuck, without touching Save Changes.
      await waitFor(() =>
        expect(updateProfileIdentity).toHaveBeenCalledWith(
          'p1',
          expect.objectContaining({ accent: second })
        )
      );
    });

    it('AltvatarConfirmedWithFieldsEdited_CommitsTheIdentityAloneAndLeavesTheFields', async () => {
      const user = userEvent.setup();
      const [, second] = ACCENT_NAMES;
      renderForm(makeProfile({ name: 'Kiddo' }));

      await user.type(screen.getByLabelText(/name/i), ' the half-typed');
      await user.click(editAltvatar()!);
      await user.click(
        screen.getByRole('radio', { name: new RegExp(second, 'i') })
      );
      await user.click(
        screen.getByRole('button', { name: /use this altvatar/i })
      );

      // The two edits are on different contracts: choosing a face commits, and
      // a name still being typed is not dragged along by it.
      await waitFor(() => expect(updateProfileIdentity).toHaveBeenCalled());
      expect(updateProfileSettings).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/name/i)).toHaveValue('Kiddo the half-typed');
    });

    it('AltvatarSaveFails_StillPromptsBeforeSwitching', async () => {
      const user = userEvent.setup();
      const [, second] = ACCENT_NAMES;
      updateProfileIdentity.mockResolvedValue({
        success: false,
        message: 'Your Altvatar was not fully saved',
      });
      renderWithSwitcher();

      await user.click(editAltvatar()!);
      await user.click(
        screen.getByRole('radio', { name: new RegExp(second, 'i') })
      );
      await user.click(
        screen.getByRole('button', { name: /use this altvatar/i })
      );
      await waitFor(() => expect(updateProfileIdentity).toHaveBeenCalled());
      await user.click(switchButton());

      // A face the write did not land is still an unsaved edit, so the guard
      // that survived the immediate save is what keeps it recoverable.
      expect(prompt()).toBeInTheDocument();
    });

    it('CustomizerCancelled_LeavesTheHostsAccentUntouched', async () => {
      const user = userEvent.setup();
      const [first, second] = ACCENT_NAMES;
      const { container } = renderForm(
        makeProfile(),
        makeDraft({ accent: first })
      );
      /* eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- see above. */
      const band = () => container.querySelector('.profile-space-band');
      const before = band()?.getAttribute('style');

      await user.click(editAltvatar()!);
      await user.click(
        screen.getByRole('radio', { name: new RegExp(second, 'i') })
      );
      await user.click(screen.getByRole('button', { name: /^cancel$/i }));

      expect(band()?.getAttribute('style')).toBe(before);
    });
  });

  describe('Owner', () => {
    it('RoleOwner_RendersEditableFieldsAndSubmitControl', () => {
      renderForm(makeProfile({ role: 'owner' }));
      expect(screen.getByLabelText(/name/i)).toBeEnabled();
      expect(screen.getByLabelText(/tagline/i)).toBeEnabled();
      expect(editAltvatar()).toBeEnabled();
      expect(save()).toBeInTheDocument();
    });

    it('ClosedForm_CarriesNoAccentFieldAmongItsInputs', () => {
      renderForm(makeProfile({ role: 'owner' }));
      // Accent and face are one identity edited in one place. The picker
      // exists, but only inside the customizer — never as a field of the form.
      expect(screen.queryByRole('group', { name: /accent/i })).toBeNull();
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });

    it('UneditedFields_DisablesTheSubmitControl', () => {
      renderForm(makeProfile({ role: 'owner' }));
      expect(save()).toBeDisabled();
    });

    it('EditedField_EnablesTheSubmitControl', async () => {
      renderForm(makeProfile({ role: 'owner' }));
      await userEvent.type(screen.getByLabelText(/tagline/i), 'Edited');
      expect(save()).toBeEnabled();
    });

    it('FieldEditReverted_DisablesTheSubmitControlAgain', async () => {
      renderForm(makeProfile({ role: 'owner', name: 'Kiddo' }));
      const name = screen.getByLabelText(/name/i);
      await userEvent.type(name, '!');
      expect(save()).toBeEnabled();

      await userEvent.type(name, '{backspace}');
      expect(save()).toBeDisabled();
    });

    it('AltvatarConfirmedWithNoFieldEdit_LeavesTheSubmitControlDisabled', async () => {
      const [, second] = ACCENT_NAMES;
      renderForm(makeProfile({ role: 'owner' }));
      await userEvent.click(editAltvatar()!);
      await userEvent.click(
        screen.getByRole('radio', { name: new RegExp(second, 'i') })
      );
      await userEvent.click(
        screen.getByRole('button', { name: /use this altvatar/i })
      );

      // The face is already committed by its own write, so the control has
      // nothing left to save — offering it would write the fields for a change
      // the viewer made somewhere else.
      await waitFor(() => expect(updateProfileIdentity).toHaveBeenCalled());
      expect(save()).toBeDisabled();
    });

    it('SubmitEditedFields_SendsNameAndTaglineAlone', async () => {
      renderForm(makeProfile({ role: 'owner' }));
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
        })
      );
    });
  });

  describe('Manager', () => {
    // A viewer who cannot save is shown what the profile holds, not a roll.
    const renderAsManager = () =>
      renderForm(makeProfile({ role: 'manager' }), null, true);

    it('RoleManager_DisablesEveryFieldAndOffersNoAltvatarEdit', () => {
      renderAsManager();
      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByLabelText(/tagline/i)).toBeDisabled();
      expect(editAltvatar()).toBeNull();
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
      renderForm(makeProfile({ role: 'owner' }));
      await userEvent.type(screen.getByLabelText(/tagline/i), 'Edited');
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
      renderForm(makeProfile({ role: 'owner' }));
      await userEvent.type(screen.getByLabelText(/tagline/i), 'Edited');
      await userEvent.click(save()!);

      expect(
        await screen.findByText('Tagline must be 40 characters or less')
      ).toBeInTheDocument();
    });
  });

  describe('SuggestedDraft', () => {
    it('DraftAccent_OpensTheCustomizerOnThatPresetWithoutWriting', async () => {
      renderForm(makeProfile({ accent: null }), makeDraft({
        accent: ACCENT_NAMES[2],
      }));
      await userEvent.click(editAltvatar()!);

      const checked = screen
        .getAllByRole('radio')
        .filter((s) => (s as HTMLInputElement).checked);
      expect(checked).toHaveLength(1);
      expect(checked[0]).toHaveAttribute('value', String(ACCENT_NAMES[2]));
      expect(updateProfileIdentity).not.toHaveBeenCalled();
    });
  });

  describe('UnsavedChanges', () => {
    it('UneditedForm_SwitchesWithoutPrompting', async () => {
      renderWithSwitcher();
      await userEvent.click(switchButton());

      expect(prompt()).not.toBeInTheDocument();
      expect(switchActiveProfile).toHaveBeenCalledWith('p2');
    });

    it('EditedField_PromptsBeforeSwitching', async () => {
      renderWithSwitcher();
      await userEvent.type(screen.getByLabelText(/name/i), '!');
      await userEvent.click(switchButton());

      expect(prompt()).toBeInTheDocument();
      expect(switchActiveProfile).not.toHaveBeenCalled();
    });

    it('EditReverted_SwitchesWithoutPrompting', async () => {
      renderWithSwitcher();
      await userEvent.type(screen.getByLabelText(/name/i), '!');
      await userEvent.type(screen.getByLabelText(/name/i), '{backspace}');
      await userEvent.click(switchButton());

      expect(prompt()).not.toBeInTheDocument();
      expect(switchActiveProfile).toHaveBeenCalledWith('p2');
    });

    it('SavedEdit_SwitchesWithoutPrompting', async () => {
      renderWithSwitcher();
      await userEvent.type(screen.getByLabelText(/name/i), '!');
      await userEvent.click(save() as HTMLElement);
      await waitFor(() => expect(updateProfileSettings).toHaveBeenCalled());

      await userEvent.click(switchButton());

      expect(prompt()).not.toBeInTheDocument();
      expect(switchActiveProfile).toHaveBeenCalledWith('p2');
    });
  });
});
