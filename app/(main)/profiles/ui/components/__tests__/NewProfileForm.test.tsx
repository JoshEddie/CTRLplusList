/**
 * Pins `profiles-surface` — "The managed-profile birth form SHALL be an overlay
 * on the Profiles page".
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';
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
  describe('AccentPreselection', () => {
    it('Open_SelectsExactlyOnePresetSwatch', () => {
      render(<NewProfileForm onClose={onClose} />);
      const swatches = screen.getAllByRole('radio');
      expect(swatches).toHaveLength(ACCENT_NAMES.length);
      expect(
        swatches.filter((s) => (s as HTMLInputElement).checked)
      ).toHaveLength(1);
    });

    it('OpenedRepeatedly_SelectsOnlyPresetNamesNeverTheFallback', () => {
      const chosen = new Set<string>();
      for (let i = 0; i < 40; i += 1) {
        const { unmount } = render(<NewProfileForm onClose={onClose} />);
        const checked = screen
          .getAllByRole('radio')
          .find((s) => (s as HTMLInputElement).checked);
        chosen.add((checked as HTMLInputElement | undefined)?.value ?? '');
        unmount();
      }
      for (const value of chosen) {
        expect(ACCENT_NAMES).toContain(value);
      }
      expect(chosen.size).toBeGreaterThan(1);
    });

    it('ClickAnotherSwatch_MovesSelection-SendsThatHue', async () => {
      render(<NewProfileForm onClose={onClose} />);
      const swatches = screen.getAllByRole('radio') as HTMLInputElement[];
      const other = swatches.find((s) => !s.checked)!;

      await userEvent.click(other);
      expect(other.checked).toBe(true);
      expect(swatches.filter((s) => s.checked)).toHaveLength(1);

      await userEvent.type(screen.getByLabelText(/name/i), 'Kiddo');
      await userEvent.click(submit());
      await waitFor(() =>
        expect(createProfile).toHaveBeenCalledWith(
          expect.objectContaining({ accent: other.value })
        )
      );
    });

    it('ClickAnotherSwatch_NamesTheNewSelectionInTheLegend', async () => {
      render(<NewProfileForm onClose={onClose} />);
      const swatches = screen.getAllByRole('radio') as HTMLInputElement[];
      const other = swatches.find((s) => !s.checked)!;

      await userEvent.click(other);
      expect(
        screen.getByText(other.value, { selector: '.profile-accent-selected' })
      ).toBeInTheDocument();
    });

    it('Open_RingsTheSelectedSwatchInItsOwnInk', () => {
      const { container } = render(<NewProfileForm onClose={onClose} />);
      const checked = (
        screen
          .getAllByRole('radio')
          .find((s) => (s as HTMLInputElement).checked) as HTMLInputElement
      ).value as keyof typeof ACCENT_PRESETS;

      // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container -- the option wraps a decorative aria-hidden swatch; the custom property it sets is the only place the ring colour is observable.
      const option = container.querySelectorAll('.profile-accent-option')[
        ACCENT_NAMES.indexOf(checked)
      ];
      // Custom properties survive as authored, so this reads the hex the
      // palette holds rather than a colour spelled out in the test.
      expect(option.getAttribute('style')).toContain(
        `--accent-ink: ${ACCENT_PRESETS[checked].ink}`
      );
    });

    it('Open_NamesThePreselectedAccentInTheLegend', () => {
      render(<NewProfileForm onClose={onClose} />);
      const checked = (
        screen
          .getAllByRole('radio')
          .find((s) => (s as HTMLInputElement).checked) as HTMLInputElement
      ).value;
      expect(
        screen.getByText(checked, { selector: '.profile-accent-selected' })
      ).toBeInTheDocument();
    });

    it('SubmitWithoutChangingAccent_SendsThePreselectedPreset', async () => {
      render(<NewProfileForm onClose={onClose} />);
      const preselected = (
        screen
          .getAllByRole('radio')
          .find((s) => (s as HTMLInputElement).checked) as HTMLInputElement
      ).value;

      await userEvent.type(screen.getByLabelText(/name/i), 'Kiddo');
      await userEvent.click(submit());

      await waitFor(() =>
        expect(createProfile).toHaveBeenCalledWith(
          expect.objectContaining({ accent: preselected })
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
