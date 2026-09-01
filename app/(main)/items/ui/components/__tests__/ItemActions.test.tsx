/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The aria-hidden ↗ icon and the empty-render states expose no roles to
 * query, so those assertions go through the container.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ItemActions from '../ItemActions';

const STORE = { name: 'Amazon', link: 'https://a.example', price: '35.50' };

function renderActions(
  overrides: Partial<React.ComponentProps<typeof ItemActions>> = {}
) {
  const props: React.ComponentProps<typeof ItemActions> = {
    isOwner: false,
    fullyClaimed: false,
    viewerClaimed: false,
    hasAnyClaim: false,
    tier: 'identity',
    store: STORE,
    onPurchaseClick: vi.fn(),
    onAddClaimClick: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ItemActions {...props} />) };
}

const viewItem = () =>
  screen.queryByRole('link', { name: 'View item — opens in new tab' });
const buyClaim = () =>
  screen.queryByRole('link', { name: 'Buy & Claim — opens in new tab' });

describe('ItemActions', () => {
  describe('StateMatrix', () => {
    it('AuthedClaimableWithLink_RendersBuyClaimPrimaryOverViewAndAdd', () => {
      renderActions({ showBuyClaim: true });
      const buy = buyClaim();
      expect(buy).toBeInTheDocument();
      expect(buy).toHaveClass('primary');
      expect(viewItem()).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
    });

    it('GuestClaimable_NoBuyClaim-AddClaimStaysPrimary', () => {
      renderActions();
      expect(buyClaim()).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
    });

    it('StorelessWithBuySignal_RendersAddClaimOnly', () => {
      renderActions({ showBuyClaim: true, store: null });
      expect(buyClaim()).not.toBeInTheDocument();
      expect(viewItem()).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
    });

    it('LinklessStoreWithBuySignal_OmitsBuyClaimAndViewItem', () => {
      renderActions({
        showBuyClaim: true,
        store: { name: '', link: '', price: '35.50' },
      });
      expect(buyClaim()).not.toBeInTheDocument();
      expect(viewItem()).not.toBeInTheDocument();
    });

    it('ViewOnlyWithBuySignal_OmitsBuyClaim', () => {
      renderActions({ showBuyClaim: true, viewOnly: true });
      expect(buyClaim()).not.toBeInTheDocument();
    });

    it('NonOwnerClaimable_RendersAddClaimWithViewItem-NoManage', () => {
      renderActions();
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
      expect(viewItem()).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Manage claim' })
      ).not.toBeInTheDocument();
    });

    it('ViewerClaimedSlotsRemain_RendersManageClaimViewItemAndAddClaim', () => {
      renderActions({ viewerClaimed: true });
      expect(
        screen.getByRole('button', { name: 'Manage claim' })
      ).toBeInTheDocument();
      expect(viewItem()).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
    });

    it('GuestClaimedSlotsRemain_RendersManageClaimWithViewItemOnly-NoAddClaim', () => {
      renderActions({ viewerClaimed: true, guestViewer: true });
      expect(
        screen.getByRole('button', { name: 'Manage claim' })
      ).toBeInTheDocument();
      expect(viewItem()).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Add Claim' })
      ).not.toBeInTheDocument();
      expect(buyClaim()).not.toBeInTheDocument();
    });

    it('GuestUnclaimed_KeepsAddClaimDespiteGuestViewer', () => {
      renderActions({ guestViewer: true });
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
    });

    it('ViewerClaimedNoSlots_RendersManageClaimWithViewItemOnly', () => {
      renderActions({ viewerClaimed: true, fullyClaimed: true });
      expect(
        screen.getByRole('button', { name: 'Manage claim' })
      ).toBeInTheDocument();
      expect(viewItem()).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Add Claim' })
      ).not.toBeInTheDocument();
    });

    it('FullyClaimedByOthers_RendersStatusAndViewItem-NoClaimAffordance', () => {
      renderActions({ fullyClaimed: true });
      expect(screen.getByRole('status')).toHaveTextContent('Fully claimed');
      expect(viewItem()).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('NoStoreClaimable_RendersAddClaimWithoutViewItem', () => {
      renderActions({ store: null });
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
      expect(viewItem()).not.toBeInTheDocument();
    });

    it('ViewBesideOtherActions_KeepsSecondaryVariant', () => {
      renderActions();
      expect(viewItem()).toHaveClass('secondary');
    });

    it('OwnerClaimsTierClaimable_RendersAddClaimAndViewItem', () => {
      renderActions({ isOwner: true, tier: 'claims' });
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
      expect(viewItem()).toBeInTheDocument();
    });

    it('OwnerClaimsTierHasClaims_RendersManageClaimsAndViewItem', () => {
      renderActions({
        isOwner: true,
        tier: 'claims',
        hasAnyClaim: true,
      });
      expect(
        screen.getByRole('button', { name: 'Manage claims' })
      ).toBeInTheDocument();
      expect(viewItem()).toBeInTheDocument();
    });

    it('OwnerNoStoreViewOnly_RendersNothing', () => {
      const { container } = renderActions({
        isOwner: true,
        viewOnly: true,
        store: null,
      });
      expect(container.firstChild).toBeNull();
    });
  });

  // Below `claims` the action set may not vary with another party's claim:
  // `Fully claimed`, `Manage claims`, and the absence of `Buy & Claim` each
  // state the item carries a claim, which is exactly what the tier withholds.
  // A claim the VIEWER holds is no surprise to them, so it still reaches
  // `Manage claim`.
  for (const tier of ['surprise', 'progress'] as const) {
    describe(`BelowClaims${tier[0].toUpperCase()}${tier.slice(1)}`, () => {
      const protectedProps = { tier };

      it('UnclaimedItem_RendersAddClaimAndViewItem', () => {
        renderActions(protectedProps);
        expect(
          screen.getByRole('button', { name: 'Add Claim' })
        ).toBeInTheDocument();
        expect(viewItem()).toBeInTheDocument();
      });

      it('FullyClaimedByOthers_RendersTheSameSetAsUnclaimed', () => {
        renderActions({
          ...protectedProps,
          fullyClaimed: true,
          hasAnyClaim: true,
        });
        expect(
          screen.getByRole('button', { name: 'Add Claim' })
        ).toBeInTheDocument();
        expect(viewItem()).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: 'Manage claims' })
        ).not.toBeInTheDocument();
      });

      it('ClaimableWithBuySignal_SuppressesBuyClaim', () => {
        renderActions({ ...protectedProps, showBuyClaim: true });
        expect(buyClaim()).not.toBeInTheDocument();
      });

      it('ViewerHoldsClaim_RendersManageClaim', () => {
        renderActions({
          ...protectedProps,
          viewerClaimed: true,
          hasAnyClaim: true,
        });
        expect(
          screen.getByRole('button', { name: 'Manage claim' })
        ).toBeInTheDocument();
      });
    });
  }

  describe('ViewOnly', () => {
    it('ViewOnlyWithStore_RendersOnlyLiveViewItemAnchor-PromotedToPrimary', () => {
      renderActions({ viewOnly: true, viewerClaimed: true });
      const link = viewItem();
      expect(link).toHaveAttribute('href', STORE.link);
      expect(link).toHaveClass('primary');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('ViewOnlyNoStore_RendersNothing', () => {
      const { container } = renderActions({ viewOnly: true, store: null });
      expect(container.firstChild).toBeNull();
    });
  });

  describe('ViewItemSemantics', () => {
    it('ViewItem_TargetsStoreInNewTabWithHiddenIcon', () => {
      const { container } = renderActions();
      const link = viewItem();
      expect(link).toHaveAttribute('href', STORE.link);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
      expect(container.querySelector('a svg')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    });

    it('ViewItemClick_DoesNotPropagateToEnclosingHandler', async () => {
      const user = userEvent.setup();
      const onEnclosingClick = vi.fn();
      render(
        <div onClick={onEnclosingClick}>
          <ItemActions
            isOwner={false}
            fullyClaimed={false}
            viewerClaimed={false}
            hasAnyClaim={false}
            tier="identity"
            store={STORE}
          />
        </div>
      );
      await user.click(viewItem() as HTMLElement);
      expect(onEnclosingClick).not.toHaveBeenCalled();
    });
  });

  describe('BuyClaimSemantics', () => {
    it('BuyClaim_TargetsStoreInNewTabWithHiddenIcon', () => {
      renderActions({ showBuyClaim: true });
      const buy = buyClaim();
      expect(buy).toHaveAttribute('href', STORE.link);
      expect(buy).toHaveAttribute('target', '_blank');
      expect(buy).toHaveAttribute('rel', 'noreferrer');
      expect(buy?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });

    it('BuyClaimClick_FiresOnBuyClaimClick-DoesNotPropagate', async () => {
      const user = userEvent.setup();
      const onEnclosingClick = vi.fn();
      const onBuyClaimClick = vi.fn();
      render(
        <div onClick={onEnclosingClick}>
          <ItemActions
            isOwner={false}
            fullyClaimed={false}
            viewerClaimed={false}
            hasAnyClaim={false}
            tier="identity"
            showBuyClaim
            store={STORE}
            onBuyClaimClick={onBuyClaimClick}
          />
        </div>
      );
      await user.click(buyClaim() as HTMLElement);
      expect(onBuyClaimClick).toHaveBeenCalledTimes(1);
      expect(onEnclosingClick).not.toHaveBeenCalled();
    });
  });

  describe('StatusSemantics', () => {
    it('FullyClaimedStatus_IsNotAButtonAndNotFocusable', () => {
      renderActions({ fullyClaimed: true });
      const status = screen.getByRole('status');
      expect(status.tagName).not.toBe('BUTTON');
      expect(status).not.toHaveAttribute('tabindex');
    });
  });

  it('AddClaimClick_FiresOnAddClaimClickOnce-NotOnPurchaseClick', async () => {
    const user = userEvent.setup();
    const { props } = renderActions();
    await user.click(screen.getByRole('button', { name: 'Add Claim' }));
    expect(props.onAddClaimClick).toHaveBeenCalledTimes(1);
    expect(props.onPurchaseClick).not.toHaveBeenCalled();
  });

  it('ManageClaimClick_FiresOnPurchaseClickOnce-NotOnAddClaimClick', async () => {
    const user = userEvent.setup();
    const { props } = renderActions({ viewerClaimed: true });
    await user.click(screen.getByRole('button', { name: 'Manage claim' }));
    expect(props.onPurchaseClick).toHaveBeenCalledTimes(1);
    expect(props.onAddClaimClick).not.toHaveBeenCalled();
  });
});
