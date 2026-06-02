/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * Modal's close affordance is a class-only `<div className="close-button">` with no role.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseView } from '@/lib/types';
import PurchaseModalSlot from '../PurchaseModalSlot';

vi.mock('@/app/(auth)/ui/components/SignInButton', () => ({
  default: () => <div data-testid="signin-button" />,
}));

const claim: PurchaseView = { id: 'pm', by: 'self', firstName: 'You' };

function renderSlot(
  overrides: Partial<React.ComponentProps<typeof PurchaseModalSlot>> = {}
) {
  const props: React.ComponentProps<typeof PurchaseModalSlot> = {
    myClaim: null,
    user_id: undefined,
    user_name: null,
    guestName: '',
    setGuestName: vi.fn(),
    purchaseFlow: 'initial',
    setPurchaseFlow: vi.fn(),
    onClose: vi.fn(),
    onPurchaseConfirm: vi.fn(),
    onUndoConfirm: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<PurchaseModalSlot {...props} />) };
}

describe('PurchaseModalSlot', () => {
  it('MyClaim_RendersRemoveClaimFlow-FiresUndo', async () => {
    const user = userEvent.setup();
    const { props } = renderSlot({ myClaim: claim });
    expect(
      screen.getByText('Remove your claim on this item?')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove my claim' }));
    expect(props.onUndoConfirm).toHaveBeenCalledTimes(1);
  });

  it('NoClaimUnauthenticated_RendersGuestPurchaseFlow', () => {
    renderSlot();
    expect(screen.getByTestId('signin-button')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
  });

  it('NoClaimAuthenticated_RendersPurchaseChoiceFlow', () => {
    renderSlot({ user_id: 'viewer', user_name: 'Vicky' });
    expect(
      screen.getByRole('button', { name: 'I purchased it' })
    ).toBeInTheDocument();
  });

  it('CloseAffordance_FiresOnClose', async () => {
    const user = userEvent.setup();
    const { props, container } = renderSlot({ myClaim: claim });
    await user.click(container.querySelector('.close-button') as HTMLElement);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
