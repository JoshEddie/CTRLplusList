/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * Modal's close affordance is a class-only `<div className="close-button">` with no role.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClaimPickerForItem } from '@/lib/data/user.actions';
import { PurchaseView } from '@/lib/types';
import PurchaseModalSlot from '../PurchaseModalSlot';

vi.mock('@/app/(auth)/ui/components/SignInButton', () => ({
  default: () => <div data-testid="signin-button" />,
}));

// user.actions is a 'use server' module whose import chain reaches the DB
// driver; PurchaseFlowContainer only consumes the picker read.
vi.mock('@/lib/data/user.actions', () => ({
  getClaimPickerForItem: vi.fn(),
}));

const selfClaim: PurchaseView = {
  id: 'pm',
  by: 'self',
  firstName: 'You',
  claimedByViewer: true,
};
const attributedClaim: PurchaseView = {
  id: 'pa',
  by: 'other',
  firstName: 'Grandma',
  claimedByViewer: true,
};

function renderSlot(
  overrides: Partial<React.ComponentProps<typeof PurchaseModalSlot>> = {}
) {
  const props: React.ComponentProps<typeof PurchaseModalSlot> = {
    removableClaim: null,
    user_id: undefined,
    isOwner: false,
    itemId: 'i1',
    itemName: 'Fancy Mug',
    onClose: vi.fn(),
    onSelfClaim: vi.fn(),
    onAttributedClaim: vi.fn(),
    onGuestClaim: vi.fn(),
    onUndoConfirm: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<PurchaseModalSlot {...props} />) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClaimPickerForItem).mockResolvedValue(null);
});

describe('PurchaseModalSlot', () => {
  it('SelfRemovableClaim_RendersRemoveYourClaimCopy-FiresUndoConfirm', async () => {
    const user = userEvent.setup();
    const { props } = renderSlot({ removableClaim: selfClaim });
    expect(
      screen.getByText('Remove your claim on this item?')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove my claim' }));
    expect(props.onUndoConfirm).toHaveBeenCalledTimes(1);
  });

  it('AttributedRemovableClaim_RendersRemoveForFirstNameCopy', () => {
    renderSlot({ removableClaim: attributedClaim });
    expect(
      screen.getByText('Remove your claim for Grandma?')
    ).toBeInTheDocument();
  });

  it('NoClaimUnauthenticated_RendersGuestClaimFlow', () => {
    renderSlot();
    expect(screen.getByTestId('signin-button')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
  });

  it('NoClaimAuthenticated_RendersClaimThisGiftFlowWithItemName', async () => {
    renderSlot({ user_id: 'viewer' });
    expect(
      screen.getByRole('heading', { name: 'Claim this gift' })
    ).toBeInTheDocument();
    expect(screen.getByText('Fancy Mug')).toBeInTheDocument();
    expect(
      await screen.findByText('No one by that name — add them below')
    ).toBeInTheDocument();
  });

  it('CloseAffordance_FiresOnClose', async () => {
    const user = userEvent.setup();
    const { props, container } = renderSlot({ removableClaim: selfClaim });
    await user.click(container.querySelector('.close-button') as HTMLElement);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
