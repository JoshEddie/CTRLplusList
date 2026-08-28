/**
 * Pins `profiles-surface` — "The managed-profile birth form SHALL be an overlay
 * on the Profiles page".
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES, ACCENT_PRESETS, isAccentName } from '@/lib/accent';
import NewProfileForm from '../NewProfileForm';

const push = vi.fn();
const createProfile = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/data/profile.actions', () => ({
  createProfile: (...args: unknown[]) => createProfile(...args),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

const onClose = vi.fn();
const submit = () => screen.getByRole('button', { name: /create profile/i });

beforeEach(() => {
  vi.clearAllMocks();
  createProfile.mockResolvedValue({ success: true, message: '', id: 'new-id' });
});

describe('NewProfileForm', () => {
  describe('AltvatarPreselection', () => {
    // The field wears its accent rather than naming it, so the preset it is
    // holding is read back off the custom properties it sets; the swatches
    // themselves live in the customizer, which opens over the form.
    /* eslint-disable testing-library/no-node-access -- the field carries no role, and the option ring is a custom property on a wrapper around an aria-hidden swatch. */
    const fieldAccent = (container: HTMLElement) => {
      const field = container.querySelector<HTMLElement>('.altvatar-field');
      const disc = field?.style.getPropertyValue('--accent-disc');
      return ACCENT_NAMES.find((n) => ACCENT_PRESETS[n].light === disc) ?? '';
    };
    // The customizer portals to document.body, so its swatches are outside
    // the render container.
    const optionAt = (index: number) =>
      document.body.querySelectorAll('.profile-accent-option')[index];
    /* eslint-enable testing-library/no-node-access */

    const openCustomizer = () =>
      userEvent.click(screen.getByRole('button', { name: /edit altvatar/i }));
    const confirm = () =>
      userEvent.click(
        screen.getByRole('button', { name: /use this altvatar/i })
      );
    const checkedSwatch = () =>
      screen
        .getAllByRole('radio')
        .find((s) => (s as HTMLInputElement).checked) as HTMLInputElement;

    it('ClosedForm_RendersNoAccentFieldBesideItsInputs', () => {
      render(<NewProfileForm onClose={onClose} />);
      // Accent and face are one identity edited in one place: the picker lives
      // in the customizer, not among the form's own fields.
      expect(screen.queryByRole('group', { name: /accent/i })).toBeNull();
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });

    it('Open_PreselectsExactlyOnePreset', async () => {
      const { container } = render(<NewProfileForm onClose={onClose} />);
      expect(ACCENT_NAMES).toContain(fieldAccent(container));

      await openCustomizer();
      const swatches = screen.getAllByRole('radio', {
        name: new RegExp(`^(${ACCENT_NAMES.join('|')})$`),
      });
      expect(swatches).toHaveLength(ACCENT_NAMES.length);
      expect(
        swatches.filter((s) => (s as HTMLInputElement).checked)
      ).toHaveLength(1);
      expect(checkedSwatch().value).toBe(fieldAccent(container));
    });

    it('OpenedRepeatedly_SelectsOnlyPresetNamesNeverTheFallback', () => {
      const chosen = new Set<string>();
      for (let i = 0; i < 40; i += 1) {
        const { container, unmount } = render(
          <NewProfileForm onClose={onClose} />
        );
        chosen.add(fieldAccent(container));
        unmount();
      }
      for (const value of chosen) {
        expect(ACCENT_NAMES).toContain(value);
      }
      expect(chosen.size).toBeGreaterThan(1);
    });

    it('PickAnotherSwatch_MovesSelection-SendsThatHue', async () => {
      render(<NewProfileForm onClose={onClose} />);
      await openCustomizer();
      const other = (screen.getAllByRole('radio') as HTMLInputElement[]).find(
        (s) => !s.checked && isAccentName(s.value)
      )!;

      await userEvent.click(other);
      expect(other.checked).toBe(true);
      expect(checkedSwatch()).toBe(other);
      await confirm();

      await userEvent.type(screen.getByLabelText(/name/i), 'Kiddo');
      await userEvent.click(submit());
      await waitFor(() =>
        expect(createProfile).toHaveBeenCalledWith(
          expect.objectContaining({ accent: other.value })
        )
      );
    });

    it('PickAnotherSwatch_NamesTheNewSelectionInTheField', async () => {
      const { container } = render(<NewProfileForm onClose={onClose} />);
      await openCustomizer();
      const other = (screen.getAllByRole('radio') as HTMLInputElement[]).find(
        (s) => !s.checked && isAccentName(s.value)
      )!;
      const picked = other.value;

      await userEvent.click(other);
      await confirm();

      expect(fieldAccent(container)).toBe(picked);
    });

    it('Open_RingsTheSelectedSwatchInItsOwnInk', async () => {
      render(<NewProfileForm onClose={onClose} />);
      await openCustomizer();
      const checked = checkedSwatch().value as keyof typeof ACCENT_PRESETS;

      // Custom properties survive as authored, so this reads the hex the
      // palette holds rather than a colour spelled out in the test.
      expect(
        optionAt(ACCENT_NAMES.indexOf(checked)).getAttribute('style')
      ).toContain(`--accent-ink: ${ACCENT_PRESETS[checked].ink}`);
    });

    it('SubmitWithoutOpeningTheCustomizer_SendsThePreselectedAltvatar', async () => {
      const { container } = render(<NewProfileForm onClose={onClose} />);
      const preselected = fieldAccent(container);

      await userEvent.type(screen.getByLabelText(/name/i), 'Kiddo');
      await userEvent.click(submit());

      await waitFor(() =>
        expect(createProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            accent: preselected,
            // Selections only — the rendering is derived server-side.
            altvatar: {
              style: expect.any(String),
              options: expect.objectContaining({ seed: expect.any(String) }),
            },
          })
        )
      );
    });
  });

  describe('Submission', () => {
    it('TypedNameAndWhitespaceTagline_SendsTheFieldsAsTyped', async () => {
      render(<NewProfileForm onClose={onClose} />);
      await userEvent.type(screen.getByLabelText(/name/i), 'Kiddo');
      await userEvent.type(screen.getByLabelText(/tagline/i), '   ');
      await userEvent.click(submit());

      // The trim-to-null is the schema's own transform at the action boundary,
      // asserted in profile.actions; the form ships what was typed.
      await waitFor(() =>
        expect(createProfile).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Kiddo', tagline: '   ' })
        )
      );
    });

    it('CreationSucceeds_ClosesOverlay-NavigatesToNewProfileSpace-NoSuccessToast', async () => {
      render(<NewProfileForm onClose={onClose} />);
      await userEvent.type(screen.getByLabelText(/name/i), 'Kiddo');
      await userEvent.click(submit());

      await waitFor(() =>
        expect(push).toHaveBeenCalledWith('/profiles/new-id')
      );
      expect(onClose).toHaveBeenCalled();
      expect(toastSuccess).not.toHaveBeenCalled();
    });

    it('CreationFails_KeepsOverlayMounted-RendersMessageInline-ToastError-NoNavigation', async () => {
      createProfile.mockResolvedValue({
        success: false,
        message: 'Name is required',
      });
      render(<NewProfileForm onClose={onClose} />);
      await userEvent.click(submit());

      // Await the settle signal (the inline message) before asserting absence.
      expect(await screen.findByText('Name is required')).toBeInTheDocument();
      expect(submit()).toBeInTheDocument();
      expect(toastError).toHaveBeenCalledWith('Name is required');
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe('Dismissal', () => {
    it('ClickClose_CallsOnCloseWithoutCreating', async () => {
      render(<NewProfileForm onClose={onClose} />);
      await userEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalled();
      expect(createProfile).not.toHaveBeenCalled();
    });
  });

  describe('TaglineClientMirror', () => {
    it('Open_CapsTaglineInputAt40AndNameAt60', () => {
      render(<NewProfileForm onClose={onClose} />);
      expect(screen.getByLabelText(/tagline/i)).toHaveAttribute(
        'maxLength',
        '40'
      );
      expect(screen.getByLabelText(/name/i)).toHaveAttribute('maxLength', '60');
    });
  });
});
