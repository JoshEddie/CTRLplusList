/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * Modal's close affordance is a class-only `<div className="close-button">` with no role.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClaimPickerForItem } from '@/lib/data/user.actions';
import { PurchaseView } from '@/lib/types';
import PurchaseModalSlot from '../PurchaseModalSlot';

// user.actions is a 'use server' module whose import chain reaches the DB
// driver; PurchaseFlowContainer only consumes the picker read.
vi.mock('@/lib/data/user.actions', () => ({
  getClaimPickerForItem: vi.fn(),
  signInUser: vi.fn(),
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

const ITEM = {
  id: 'i1',
  name: 'Fancy Mug',
  description: '',
  image_url: '',
  stores: [{ name: 'Amazon', link: 'https://a.example', price: '35.50' }],
} as never;

function renderSlot(
  overrides: Partial<React.ComponentProps<typeof PurchaseModalSlot>> = {}
) {
  const props: React.ComponentProps<typeof PurchaseModalSlot> = {
    removableClaim: null,
    user_id: undefined,
    isOwner: false,
    showSpoilers: false,
    ownerCanClaim: false,
    ownerClaims: [],
    item: ITEM,
    onClose: vi.fn(),
    onSelfClaim: vi.fn(),
    onAttributedClaim: vi.fn(),
    onGuestClaim: vi.fn(),
    onRemoveClaim: vi.fn(),
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
  describe('AlreadyClaimed', () => {
    it('SelfRemovableClaim_RendersYouClaimedThisBanner-FiresRemovalInOneActivation', async () => {
      const user = userEvent.setup();
      const { props } = renderSlot({ removableClaim: selfClaim });
      expect(screen.getByRole('status')).toHaveTextContent('You claimed this');
      await user.click(screen.getByRole('button', { name: 'Remove my claim' }));
      expect(props.onUndoConfirm).toHaveBeenCalledTimes(1);
    });

    it('AttributedRemovableClaim_BannerNamesTheAttributedPerson', () => {
      renderSlot({ removableClaim: attributedClaim });
      expect(screen.getByRole('status')).toHaveTextContent(
        'You claimed this for Grandma'
      );
    });

    it('AlreadyClaimed_StoreRowStillRendersLiveStoreLink', () => {
      renderSlot({ removableClaim: selfClaim });
      const link = screen.getByRole('link', { name: /Amazon/ });
      expect(link).toHaveAttribute('href', 'https://a.example');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('AlreadyClaimed_HeaderShowsItemNameAndPrice', () => {
      renderSlot({ removableClaim: selfClaim });
      expect(
        screen.getByRole('heading', { name: 'Fancy Mug' })
      ).toBeInTheDocument();
      expect(screen.getByText('$35.50')).toBeInTheDocument();
    });
  });

  it('NoClaimUnauthenticated_RendersGuestClaimFlow', () => {
    renderSlot();
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Claim as Guest' })
    ).toBeInTheDocument();
  });

  it('NoClaimAuthenticated_RendersClaimFlowWithItemHeader', async () => {
    renderSlot({ user_id: 'viewer' });
    expect(
      screen.getByRole('heading', { name: 'Fancy Mug' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Claim this gift' })
    ).toBeInTheDocument();
  });

  it('CloseAffordance_FiresOnClose', async () => {
    const user = userEvent.setup();
    const { props, container } = renderSlot({ removableClaim: selfClaim });
    await user.click(container.querySelector('.close-button') as HTMLElement);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
