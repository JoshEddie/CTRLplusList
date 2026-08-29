/**
 * Pins `onboarding-gate`'s surface SHALLs over the story presentation: two
 * copy sets over one story, the two inputs and no others, focus landing inside
 * the gate, no route out at all — no close, no cancel — the beats advancing
 * and retreating, and the look being confirmed before submit exists.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES } from '@/lib/accent';
import OnboardingGate from '../OnboardingGate';

vi.mock('@/lib/altvatar/render', () => ({
  renderAltvatar: (styleId: string) => Promise.resolve(`data:${styleId}`),
}));

const completeOnboarding = vi.fn();
const toastError = vi.fn();

vi.mock('@/lib/data/onboarding.actions', () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}));

const suggested = { style: 'toon-head', options: { seed: 'roll', selections: {} } };

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
      samples={Array.from({ length: 5 }, () => suggested)}
    />
  );

const nameField = () => screen.getByRole('textbox', { name: /name/i });
const next = () =>
  userEvent.click(screen.getByRole('button', { name: /next/i }));
// Opening the customizer and confirming its pre-seeded roll is the story's
// minimum path forward from the third beat; nothing inside it has to be
// touched. Confirming is what advances to the final confirmation beat.
const chooseLook = async () => {
  await userEvent.click(
    screen.getByRole('button', { name: /choose your look/i })
  );
  await userEvent.click(
    screen.getByRole('button', { name: /use this altvatar/i })
  );
};
const toFinalBeat = async () => {
  await next();
  await next();
  await chooseLook();
};
const submit = (label: RegExp) =>
  userEvent.click(screen.getByRole('button', { name: label }));

beforeEach(() => {
  completeOnboarding.mockReset().mockResolvedValue({
    success: true,
    message: 'Welcome',
  });
  toastError.mockReset();
});

describe('SignupArm', () => {
  it('Rendered_ReadsAsFinishingSignUp', async () => {
    renderGate();
    expect(
      screen.getByRole('dialog', {
        name: 'Finish setting up your Altvatar',
      })
    ).toBeInTheDocument();
    await toFinalBeat();
    expect(
      screen.getByRole('button', { name: 'Create my Altvatar and jump in' })
    ).toBeInTheDocument();
  });
});

describe('ExistingArm', () => {
  it('Rendered_DoesNotDescribeCreatingAnAccount', async () => {
    renderGate('existing', 'Ada');
    const dialog = screen.getByRole('dialog', { name: 'Pick your Altvatar' });
    expect(within(dialog).queryByText(/signing up/i)).toBeNull();
    await next();
    expect(within(dialog).queryByText(/signing up/i)).toBeNull();
    await next();
    expect(within(dialog).queryByText(/signing up/i)).toBeNull();
    await chooseLook();
    expect(within(dialog).queryByText(/signing up/i)).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Save and jump in' })
    ).toBeInTheDocument();
  });
});

describe('Story', () => {
  it('Rendered_OpensOnTheIntroBeat', () => {
    renderGate();
    expect(
      screen.getByRole('heading', { name: 'Meet Altvatars' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /fifty altvatars/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('Next_StepsToTheThirdBeat-OffersChoosingAsTheOnlyWayForward', async () => {
    renderGate();
    await next();
    expect(
      screen.getByRole('heading', { name: 'One look, everywhere you show up' })
    ).toBeInTheDocument();
    await next();
    expect(
      screen.getByRole('heading', { name: 'Run more than one' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: /choose your look/i })
    ).toBeInTheDocument();
  });

  it('ConfirmingALook_AdvancesToTheConfirmationBeat', async () => {
    renderGate();
    await next();
    await next();
    await chooseLook();
    expect(
      screen.getByRole('heading', { name: /you.re all set/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull();
  });

  it('SwipeLeft_AdvancesABeat-StopsAtTheThirdBeat', () => {
    renderGate();
    const dialog = screen.getByRole('dialog');
    const swipeLeft = () => {
      fireEvent.touchStart(dialog, { touches: [{ clientX: 300, clientY: 100 }] });
      fireEvent.touchEnd(dialog, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });
    };
    swipeLeft();
    expect(
      screen.getByRole('heading', { name: 'One look, everywhere you show up' })
    ).toBeInTheDocument();
    swipeLeft();
    swipeLeft();
    // Still the third beat: only confirming a look reaches the final one.
    expect(
      screen.getByRole('heading', { name: 'Run more than one' })
    ).toBeInTheDocument();
  });

  it('ShortOrVerticalSwipe_MovesNoBeat', () => {
    renderGate();
    const dialog = screen.getByRole('dialog');
    // Too short to be a swipe at all.
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(dialog, {
      changedTouches: [{ clientX: 130, clientY: 100 }],
    });
    // Long enough, but the vertical travel dominates: that is a scroll.
    fireEvent.touchStart(dialog, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(dialog, {
      changedTouches: [{ clientX: 200, clientY: 300 }],
    });
    expect(
      screen.getByRole('heading', { name: 'Meet Altvatars' })
    ).toBeInTheDocument();
  });

  it('LookConfirmedThenSteppingBack_DressesTheVignettesInIt', async () => {
    // Before a look is chosen the vignettes wear sample identities; after,
    // they wear the viewer's own.
    renderGate();
    await toFinalBeat();
    const back = () => userEvent.click(screen.getByRole('button', { name: 'Back' }));

    await back();
    expect(
      screen.getByRole('heading', { name: 'Run more than one' })
    ).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();

    await back();
    expect(
      screen.getByRole('heading', { name: 'One look, everywhere you show up' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Grace').length).toBeGreaterThan(0);
    expect(screen.queryByText('Marisol')).toBeNull();
  });

  it('SwipeRight_ReturnsToThePreviousBeat', async () => {
    renderGate();
    await next();
    const dialog = screen.getByRole('dialog');
    fireEvent.touchStart(dialog, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(dialog, {
      changedTouches: [{ clientX: 300, clientY: 100 }],
    });
    expect(
      screen.getByRole('heading', { name: 'Meet Altvatars' })
    ).toBeInTheDocument();
  });

  it('Back_ReturnsToThePreviousBeat', async () => {
    renderGate();
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(
      screen.getByRole('heading', { name: 'Meet Altvatars' })
    ).toBeInTheDocument();
  });
});

describe('Inputs', () => {
  it('FinalBeat_CarriesTheNameAndTheAltvatarAndNoOtherSetting', async () => {
    renderGate();
    await toFinalBeat();
    expect(nameField()).toHaveValue('Grace');
    expect(
      screen.getByRole('button', { name: /change your look/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('AccountCarryingNoName_StartsTheFieldEmpty', async () => {
    renderGate('signup', null);
    await toFinalBeat();
    expect(nameField()).toHaveValue('');
  });

  it('Rendered_MovesFocusIntoTheGate', () => {
    renderGate();
    expect(screen.getByRole('button', { name: /next/i })).toHaveFocus();
  });

  it('FinalBeat_MovesFocusToTheSubmit-NotTheNameField', async () => {
    renderGate();
    await toFinalBeat();
    // Not the name field: it is usually already right, and focusing it on a
    // phone raises the keyboard over the controls that matter.
    expect(
      screen.getByRole('button', { name: /create my altvatar/i })
    ).toHaveFocus();
  });
});

describe('NoRouteOut', () => {
  it('Rendered_OffersNoCloseOrCancelControl', () => {
    renderGate();
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
  });

  it('ClickTheBackdropItself_LeavesTheGateMounted', async () => {
    renderGate();
    await userEvent.click(screen.getByTestId('onboarding-backdrop'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('PressEscape_LeavesTheGateMounted', async () => {
    renderGate();
    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Submit', () => {
  it('TypedNameAndConfirmedSuggestion_SendsBothWithTheSuggestedAccent', async () => {
    renderGate();
    await toFinalBeat();
    await userEvent.clear(nameField());
    await userEvent.type(nameField(), 'Grace Hopper');
    await submit(/create my altvatar/i);

    expect(completeOnboarding).toHaveBeenCalledExactlyOnceWith({
      name: 'Grace Hopper',
      accent: ACCENT_NAMES[0],
      altvatar: suggested,
    });
  });

  it('AccentEditedThenConfirmed_SendsTheEditedAccent', async () => {
    renderGate();
    await next();
    await next();
    await userEvent.click(
      screen.getByRole('button', { name: /choose your look/i })
    );
    await userEvent.click(screen.getByRole('radio', { name: ACCENT_NAMES[2] }));
    await userEvent.click(
      screen.getByRole('button', { name: /use this altvatar/i })
    );
    await submit(/create my altvatar/i);

    expect(completeOnboarding).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ accent: ACCENT_NAMES[2] })
    );
  });

  it('LookConfirmed_OffersChangingItBesideTheSubmit', async () => {
    renderGate();
    await toFinalBeat();
    expect(
      screen.getByRole('button', { name: /change your look/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /choose your look/i })
    ).toBeNull();
  });

  it('ChangeYourLookCancelled_StaysOnTheConfirmationBeat', async () => {
    renderGate();
    await toFinalBeat();
    await userEvent.click(
      screen.getByRole('button', { name: /change your look/i })
    );
    expect(
      screen.getByRole('dialog', { name: 'Customise your Altvatar' })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('dialog', { name: 'Customise your Altvatar' })
    ).toBeNull();
    expect(
      screen.getByRole('heading', { name: /you.re all set/i })
    ).toBeInTheDocument();
  });

  it('ActionReportsFailure_ShowsTheMessageInline-ToastsIt', async () => {
    completeOnboarding.mockResolvedValue({
      success: false,
      message: 'Your profile was created, but its Altvatar was not saved',
    });
    renderGate();
    await toFinalBeat();
    await submit(/create my altvatar/i);

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
    await toFinalBeat();
    await submit(/create my altvatar/i);

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });
});
