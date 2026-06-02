import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PurchaseFlowContainer from '../PurchaseFlowContainer';

// SignInButton mounts a server-action <form action={signInUser}>; stub it so the
// guest branch can assert the sign-in affordance without importing the action.
vi.mock('@/app/(auth)/ui/components/SignInButton', () => ({
  default: () => <div data-testid="signin-button" />,
}));

type Flow = 'initial' | 'self' | 'other';

function renderContainer(
  overrides: Partial<React.ComponentProps<typeof PurchaseFlowContainer>> = {}
) {
  const props = {
    user_id: undefined as string | null | undefined,
    guestName: '',
    setGuestName: vi.fn(),
    handlePurchaseConfirm: vi.fn(),
    purchaseFlow: 'initial' as Flow,
    setPurchaseFlow: vi.fn(),
    user_name: 'Alice' as string | null | undefined,
    ...overrides,
  };
  render(<PurchaseFlowContainer {...props} />);
  return props;
}

describe('PurchaseFlowContainer', () => {
  describe('Unauthenticated', () => {
    it('NoUserId_RendersSignIn-GuestField-GuestPrompt', () => {
      renderContainer({ user_id: undefined });
      expect(screen.getByTestId('signin-button')).toBeInTheDocument();
      expect(
        screen.getByText('Sign in to track your purchases and save lists!')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Purchase as Guest' })
      ).toBeInTheDocument();
    });

    it('EmptyGuestName_PrimaryDisabled-NoConfirm', async () => {
      const user = userEvent.setup();
      const { handlePurchaseConfirm } = renderContainer({
        user_id: undefined,
        guestName: '   ',
      });
      const guestBtn = screen.getByRole('button', { name: 'Purchase as Guest' });
      expect(guestBtn).toBeDisabled();
      await user.click(guestBtn);
      expect(handlePurchaseConfirm).not.toHaveBeenCalled();
    });

    it('TypeGuestName_FiresSetGuestName', async () => {
      const user = userEvent.setup();
      const { setGuestName } = renderContainer({ user_id: undefined });
      await user.type(screen.getByLabelText('Your name'), 'B');
      expect(setGuestName).toHaveBeenCalledWith('B');
    });

    it('FilledGuestName_ConfirmCallsHandlerWithName', async () => {
      const user = userEvent.setup();
      const { handlePurchaseConfirm } = renderContainer({
        user_id: undefined,
        guestName: 'Bob',
      });
      await user.click(
        screen.getByRole('button', { name: 'Purchase as Guest' })
      );
      expect(handlePurchaseConfirm).toHaveBeenCalledWith('Bob');
    });
  });

  describe('Authenticated', () => {
    describe('Initial', () => {
      it('ClickIPurchased_SetsSelfFlow', async () => {
        const user = userEvent.setup();
        const { setPurchaseFlow } = renderContainer({
          user_id: 'u1',
          purchaseFlow: 'initial',
        });
        await user.click(
          screen.getByRole('button', { name: 'I purchased it' })
        );
        expect(setPurchaseFlow).toHaveBeenCalledWith('self');
      });

      it('ClickSomeoneElse_SetsOtherFlow', async () => {
        const user = userEvent.setup();
        const { setPurchaseFlow } = renderContainer({
          user_id: 'u1',
          purchaseFlow: 'initial',
        });
        await user.click(screen.getByRole('button', { name: 'Someone else' }));
        expect(setPurchaseFlow).toHaveBeenCalledWith('other');
      });
    });

    describe('Self', () => {
      it('Render_ShowsConfirmForUserName', () => {
        renderContainer({
          user_id: 'u1',
          purchaseFlow: 'self',
          user_name: 'Alice',
        });
        expect(
          screen.getByText('Confirm purchase for Alice')
        ).toBeInTheDocument();
      });

      it('ConfirmPurchase_CallsHandlerWithUserNameAndSelfFlag', async () => {
        const user = userEvent.setup();
        const { handlePurchaseConfirm } = renderContainer({
          user_id: 'u1',
          purchaseFlow: 'self',
          user_name: 'Alice',
        });
        await user.click(
          screen.getByRole('button', { name: 'Confirm Purchase' })
        );
        expect(handlePurchaseConfirm).toHaveBeenCalledWith('Alice', true);
      });

      it('Back_ReturnsToInitialFlow', async () => {
        const user = userEvent.setup();
        const { setPurchaseFlow } = renderContainer({
          user_id: 'u1',
          purchaseFlow: 'self',
        });
        await user.click(screen.getByRole('button', { name: 'Back' }));
        expect(setPurchaseFlow).toHaveBeenCalledWith('initial');
      });
    });

    describe('Other', () => {
      it('FilledName_ConfirmCallsHandlerWithGuestName', async () => {
        const user = userEvent.setup();
        const { handlePurchaseConfirm } = renderContainer({
          user_id: 'u1',
          purchaseFlow: 'other',
          guestName: 'Carol',
        });
        await user.click(
          screen.getByRole('button', { name: 'Confirm Purchase' })
        );
        expect(handlePurchaseConfirm).toHaveBeenCalledWith('Carol');
      });

      it('EmptyName_PrimaryDisabled-NoConfirm', async () => {
        const user = userEvent.setup();
        const { handlePurchaseConfirm } = renderContainer({
          user_id: 'u1',
          purchaseFlow: 'other',
          guestName: '',
        });
        const confirm = screen.getByRole('button', { name: 'Confirm Purchase' });
        expect(confirm).toBeDisabled();
        await user.click(confirm);
        expect(handlePurchaseConfirm).not.toHaveBeenCalled();
      });

      it('TypeName_FiresSetGuestName', async () => {
        const user = userEvent.setup();
        const { setGuestName } = renderContainer({
          user_id: 'u1',
          purchaseFlow: 'other',
        });
        await user.type(screen.getByLabelText("Purchaser's name"), 'C');
        expect(setGuestName).toHaveBeenCalledWith('C');
      });

      it('Back_ReturnsToInitialFlow', async () => {
        const user = userEvent.setup();
        const { setPurchaseFlow } = renderContainer({
          user_id: 'u1',
          purchaseFlow: 'other',
        });
        await user.click(screen.getByRole('button', { name: 'Back' }));
        expect(setPurchaseFlow).toHaveBeenCalledWith('initial');
      });
    });
  });
});
