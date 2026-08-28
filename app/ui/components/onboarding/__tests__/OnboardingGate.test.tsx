/**
 * Pins `onboarding-gate`'s surface SHALLs: two copy sets over one layout, the
 * two inputs and no others, focus landing inside the gate, no route out, and
 * cancel behaving differently per arm — deletion is confirmed on the signup arm
 * and nothing is deleted on the existing one.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES } from '@/lib/accent';
import OnboardingGate from '../OnboardingGate';

vi.mock('@/lib/altvatar/render', () => ({
  renderAltvatar: (styleId: string) => Promise.resolve(`data:${styleId}`),
}));

const completeOnboarding = vi.fn();
const abandonAccount = vi.fn();
const toastError = vi.fn();

vi.mock('@/lib/data/onboarding.actions', () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
}));
vi.mock('@/lib/data/user.actions', () => ({
  abandonAccount: (...args: unknown[]) => abandonAccount(...args),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}));

const suggested = { style: 'icons', options: { seed: 'roll', selections: {} } };

const renderGate = (
  arm: 'signup' | 'existing' = 'signup',
  initialName: string | null = 'Grace'
) =>
  render(
    <OnboardingGate
      arm={arm}
      initialName={initialName}
      suggested={suggested}
      suggestedAccent={ACCENT_NAMES[0]}
    />
  );

const nameField = () => screen.getByRole('textbox', { name: /name/i });
const submit = (label: RegExp) =>
  userEvent.click(screen.getByRole('button', { name: label }));

beforeEach(() => {
  completeOnboarding.mockReset().mockResolvedValue({
    success: true,
    message: 'Welcome',
  });
  abandonAccount.mockReset();
  toastError.mockReset();
});

describe('SignupArm', () => {
  it('Rendered_ReadsAsFinishingSignUp', () => {
    renderGate();
    expect(
      screen.getByRole('dialog', {
        name: 'Finish setting up your profile',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create my profile' })
    ).toBeInTheDocument();
  });
});

describe('ExistingArm', () => {
  it('Rendered_DoesNotDescribeCreatingAnAccount', () => {
    renderGate('existing', 'Ada');
    expect(
      screen.getByRole('dialog', { name: 'Pick your Altvatar' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save and continue' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/signing up/i)).toBeNull();
  });
});

describe('Inputs', () => {
  it('Rendered_CarriesTheNameAndTheAltvatarAndNoOtherSetting', () => {
    renderGate();
    expect(nameField()).toHaveValue('Grace');
    expect(
      screen.getByRole('button', { name: /edit altvatar/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('AccountCarryingNoName_StartsTheFieldEmpty', () => {
    renderGate('signup', null);
    expect(nameField()).toHaveValue('');
  });

  it('Rendered_MovesFocusIntoTheGate', () => {
    renderGate();
    expect(nameField()).toHaveFocus();
  });

  it('Rendered_CarriesTheBrandMarkNamedAltvatar', () => {
    renderGate();
    expect(screen.getByRole('img', { name: 'Altvatar' })).toBeInTheDocument();
  });
});

describe('NoRouteOut', () => {
  it('Rendered_OffersNoCloseControl', () => {
    renderGate();
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
  });

  it('ClickTheBackdropItself_LeavesTheGateMounted', async () => {
    renderGate();
    await userEvent.click(screen.getByTestId('onboarding-backdrop'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(abandonAccount).not.toHaveBeenCalled();
  });

  it('PressEscape_LeavesTheGateMounted', async () => {
    renderGate();
    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(abandonAccount).not.toHaveBeenCalled();
  });
});

describe('Submit', () => {
  it('TypedNameAndDefaultAltvatar_SendsBothWithTheSuggestedAccent', async () => {
    renderGate();
    await userEvent.clear(nameField());
    await userEvent.type(nameField(), 'Grace Hopper');
    await submit(/create my profile/i);

    expect(completeOnboarding).toHaveBeenCalledExactlyOnceWith({
      name: 'Grace Hopper',
      accent: ACCENT_NAMES[0],
      altvatar: suggested,
    });
  });

  it('AltvatarEditedThenConfirmed_SendsTheEditedAccent', async () => {
    renderGate();
    await userEvent.click(
      screen.getByRole('button', { name: /edit altvatar/i })
    );
    await userEvent.click(screen.getByRole('radio', { name: ACCENT_NAMES[2] }));
    await userEvent.click(
      screen.getByRole('button', { name: /use this altvatar/i })
    );
    await submit(/create my profile/i);

    expect(completeOnboarding).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ accent: ACCENT_NAMES[2] })
    );
  });

  it('ActionReportsFailure_ShowsTheMessageInline-ToastsIt', async () => {
    completeOnboarding.mockResolvedValue({
      success: false,
      message: 'Your profile was created, but its Altvatar was not saved',
    });
    renderGate();
    await submit(/create my profile/i);

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledExactlyOnceWith(
        'Your profile was created, but its Altvatar was not saved'
      )
    );
    expect(
      screen.getByText(
        'Your profile was created, but its Altvatar was not saved'
      )
    ).toBeInTheDocument();
  });

  it('ActionReportsANameFieldError_ShowsItOnTheField', async () => {
    completeOnboarding.mockResolvedValue({
      success: false,
      message: 'Validation failed',
      errors: { name: ['Name is required'] },
    });
    renderGate();
    await submit(/create my profile/i);

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });
});

describe('Cancel', () => {
  const cancel = () =>
    userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancel',
      })
    );

  // The confirmation renders outside the gate's own dialog and after it, so
  // the second Cancel in the document is the confirmation's.
  const declineDeletion = () =>
    userEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[1]);

  describe('SignupArm', () => {
    it('ClickCancel_RaisesTheDeletionConfirmation-DeletesNothingYet', async () => {
      renderGate();
      await cancel();
      expect(screen.getByText('Cancel sign-up?')).toBeInTheDocument();
      expect(abandonAccount).not.toHaveBeenCalled();
    });

    it('DeclineTheConfirmation_ReturnsToTheGate-DeletesNothing', async () => {
      renderGate();
      await cancel();
      await declineDeletion();
      expect(screen.queryByText('Cancel sign-up?')).toBeNull();
      expect(abandonAccount).not.toHaveBeenCalled();
      expect(nameField()).toBeInTheDocument();
    });

    it('ConfirmTheDeletion_AbandonsTheAccount', async () => {
      renderGate();
      await cancel();
      await userEvent.click(
        screen.getByRole('button', { name: 'Delete account' })
      );
      expect(abandonAccount).toHaveBeenCalledOnce();
    });
  });

  describe('ExistingArm', () => {
    it('ClickCancel_SignsOutWithNoConfirmation', async () => {
      renderGate('existing', 'Ada');
      await cancel();
      expect(screen.queryByText('Cancel sign-up?')).toBeNull();
      expect(abandonAccount).toHaveBeenCalledOnce();
    });
  });
});
