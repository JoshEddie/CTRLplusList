/**
 * Pins `active-profile` — "Switching SHALL be a server action that
 * re-verifies membership, records the switch, and announces itself" (the
 * route-following split between a profile space and a profile-scoped
 * surface) and "A switch away from unsaved changes SHALL be confirmed first".
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderWithProfileSwitch,
  routerReplace,
  setTestPathname,
} from '@/test/helpers/profile-switch';

import { switchActiveProfile } from '@/lib/data/profile.actions';
import toast from 'react-hot-toast';
import {
  ProfileSwitchProvider,
  useProfileSwitch,
  useUnsavedChanges,
} from '../ProfileSwitchProvider';

vi.mock('@/lib/data/profile.actions', () => ({
  switchActiveProfile: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const TARGET = 'p-target';

function Switcher() {
  const switchProfile = useProfileSwitch();
  return (
    <button type="button" onClick={() => switchProfile(TARGET)}>
      Switch
    </button>
  );
}

function UnsavedForm({ isDirty }: { isDirty: boolean }) {
  useUnsavedChanges(isDirty);
  return <p>form</p>;
}

const switchButton = () => screen.getByRole('button', { name: 'Switch' });
const prompt = () => screen.queryByText('You have unsaved changes');

beforeEach(() => {
  vi.clearAllMocks();
  setTestPathname('/lists');
  vi.mocked(switchActiveProfile).mockResolvedValue({
    success: true,
    message: 'Profile switched to Kiddo',
  });
});

describe('ProfileSwitchProvider', () => {
  describe('RouteFollowing', () => {
    it('ProfileScopedSurface_SwitchesWithoutNavigating', async () => {
      renderWithProfileSwitch(<Switcher />);
      await userEvent.click(switchButton());

      expect(switchActiveProfile).toHaveBeenCalledWith(TARGET);
      expect(toast.success).toHaveBeenCalledWith('Profile switched to Kiddo');
      expect(routerReplace).not.toHaveBeenCalled();
    });

    it('ProfileSpace_NavigatesToTheNewProfilesSpace', async () => {
      setTestPathname('/altvatar/p-other');
      renderWithProfileSwitch(<Switcher />);
      await userEvent.click(switchButton());

      expect(routerReplace).toHaveBeenCalledWith(`/altvatar/${TARGET}`);
    });

    it('ProfilesIndex_SwitchesWithoutNavigating', async () => {
      setTestPathname('/altvatar');
      renderWithProfileSwitch(<Switcher />);
      await userEvent.click(switchButton());

      expect(routerReplace).not.toHaveBeenCalled();
    });

    it('RejectedSwitch_RaisesTheErrorAndStaysPut', async () => {
      setTestPathname('/altvatar/p-other');
      vi.mocked(switchActiveProfile).mockResolvedValue({
        success: false,
        message: 'You do not run that profile',
      });
      renderWithProfileSwitch(<Switcher />);
      await userEvent.click(switchButton());

      expect(toast.error).toHaveBeenCalledWith('You do not run that profile');
      expect(routerReplace).not.toHaveBeenCalled();
    });
  });

  describe('UnsavedChanges', () => {
    it('DirtyForm_HoldsTheSwitchBehindAConfirmation', async () => {
      renderWithProfileSwitch(
        <>
          <UnsavedForm isDirty />
          <Switcher />
        </>
      );
      await userEvent.click(switchButton());

      expect(prompt()).toBeInTheDocument();
      expect(switchActiveProfile).not.toHaveBeenCalled();
    });

    it('ConfirmationDismissed_LeavesTheViewerEditing', async () => {
      renderWithProfileSwitch(
        <>
          <UnsavedForm isDirty />
          <Switcher />
        </>
      );
      await userEvent.click(switchButton());
      await userEvent.click(
        screen.getByRole('button', { name: 'Keep editing' })
      );

      expect(prompt()).not.toBeInTheDocument();
      expect(switchActiveProfile).not.toHaveBeenCalled();
    });

    it('ConfirmationAccepted_CompletesTheSwitch', async () => {
      renderWithProfileSwitch(
        <>
          <UnsavedForm isDirty />
          <Switcher />
        </>
      );
      await userEvent.click(switchButton());
      await userEvent.click(
        screen.getByRole('button', { name: 'Switch anyway' })
      );

      expect(switchActiveProfile).toHaveBeenCalledWith(TARGET);
      expect(toast.success).toHaveBeenCalledWith('Profile switched to Kiddo');
    });

    it('CleanForm_SwitchesWithoutConfirmation', async () => {
      renderWithProfileSwitch(
        <>
          <UnsavedForm isDirty={false} />
          <Switcher />
        </>
      );
      await userEvent.click(switchButton());

      expect(prompt()).not.toBeInTheDocument();
      expect(switchActiveProfile).toHaveBeenCalledWith(TARGET);
    });

    it('DirtyFormUnmounted_ReleasesTheHold', async () => {
      const { rerender } = renderWithProfileSwitch(
        <>
          <UnsavedForm isDirty />
          <Switcher />
        </>
      );
      rerender(
        <ProfileSwitchProvider>
          <Switcher />
        </ProfileSwitchProvider>
      );
      await userEvent.click(switchButton());

      expect(prompt()).not.toBeInTheDocument();
      expect(switchActiveProfile).toHaveBeenCalledWith(TARGET);
    });
  });

  describe('ContextThrow', () => {
    it('OrphanRender_ThrowsDescriptiveError', () => {
      // Suppress React 19's error-boundary log noise; the toThrow below is the load-bearing assertion.
      vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Switcher />)).toThrow(
        'useProfileSwitch must be used inside a <ProfileSwitchProvider>'
      );
    });
  });
});
