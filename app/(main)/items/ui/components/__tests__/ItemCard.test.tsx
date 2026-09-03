/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * `.itemDescription`, the `.item.purchased` wrapper, and the inert price line
 * are class-only with no role, so presence/absence is asserted by class.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ItemCard from '../ItemCard';

vi.mock('@/lib/data/item.placeholder.actions', async () =>
  (
    await import('../itemform/deck/__tests__/test-helpers')
  ).placeholderActionsMock()
);

const STORE = { name: 'Amazon', link: 'https://a.example', price: '35.50' };

function renderCard(
  overrides: Partial<React.ComponentProps<typeof ItemCard>> = {}
) {
  const props: React.ComponentProps<typeof ItemCard> = {
    item: {
      id: 'i1',
      name: 'Gift',
      description: '',
      image_url: '',
      store: null,
    } as never,
    className: undefined,
    isOwner: false,
    showPurchased: false,
    showSpoilerInfo: false,
    viewerClaimed: false,
    fullyClaimed: false,
    entryLine: '0/3 claimed',
    hasAnyClaim: false,
    acceptsClaims: true,
    tier: 'claims',
    onPurchaseClick: vi.fn(),
    onAddClaimClick: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ItemCard {...props} />) };
}

describe('ItemCard', () => {
  it('Viewer_RendersAddClaim-EntryLineAndDescription', () => {
    renderCard({
      item: {
        id: 'i1',
        name: 'Gift',
        description: 'A nice mug',
        image_url: '',
        store: null,
      } as never,
    });
    expect(screen.getByText('A nice mug')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add Claim' })
    ).toBeInTheDocument();
    expect(screen.getByText('0/3 claimed')).toBeInTheDocument();
  });

  it('ClaimClick_FiresAddClaimCallbackOnce', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Add Claim' }));
    expect(props.onAddClaimClick).toHaveBeenCalledTimes(1);
    expect(props.onPurchaseClick).not.toHaveBeenCalled();
  });

  describe('PriceLine', () => {
    it('CompleteStore_RendersInertStoreLine', () => {
      const { container } = renderCard({
        item: { id: 'i1', name: 'Gift', store: STORE } as never,
      });
      const metadata = container.querySelector('.item-store-metadata');
      expect(metadata).toHaveTextContent('· Amazon');
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$35.50'
      );
      expect(metadata?.closest('a, button')).toBeNull();
    });

    it('PriceLine_RendersUniformlyAcrossClaimStates', () => {
      for (const overrides of [
        { viewerClaimed: true },
        { fullyClaimed: true, showPurchased: true },
        { isOwner: true },
      ]) {
        const { container, unmount } = renderCard({
          ...overrides,
          item: { id: 'i1', name: 'Gift', store: STORE } as never,
        });
        expect(
          container.querySelector('.item-store-metadata')
        ).toHaveTextContent('· Amazon');
        unmount();
      }
    });

    it('PricedStore_RendersBarePrice-NoStoreName-NoViewOrBuy', () => {
      const { container } = renderCard({
        showBuyClaim: true,
        item: {
          id: 'i1',
          name: 'Gift',
          store: { name: '', link: '', price: '12.00' },
        } as never,
      });
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$12.00'
      );
      expect(container.querySelector('.item-store-metadata')).toBeNull();
      expect(
        screen.queryByRole('link', { name: 'View item — opens in new tab' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: 'Buy & Claim — opens in new tab' })
      ).not.toBeInTheDocument();
    });

    it('BareStore_OmitsPriceLine-ShowsAddClaim', () => {
      const { container } = renderCard({
        item: {
          id: 'i1',
          name: 'Gift',
          store: { name: '', link: '', price: '' },
        } as never,
      });
      expect(container.querySelector('.item-price-row')).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
    });

    it('IncompleteStore_OmitsPriceLineAndViewItem', () => {
      const { container } = renderCard({
        item: {
          id: 'i1',
          name: 'Gift',
          store: { name: 'Amazon', link: 'not-a-url', price: '35.50' },
        } as never,
      });
      expect(container.querySelector('.item-price-row')).toBeNull();
      expect(
        screen.queryByRole('link', { name: 'View item — opens in new tab' })
      ).not.toBeInTheDocument();
    });

    it('CardBodyTap_DoesNotOpenModal', async () => {
      const user = userEvent.setup();
      const { props, container } = renderCard({
        item: { id: 'i1', name: 'Gift', store: STORE } as never,
      });
      await user.click(
        container.querySelector('.item-store-metadata') as HTMLElement
      );
      await user.click(container.querySelector('.itemName') as HTMLElement);
      expect(props.onPurchaseClick).not.toHaveBeenCalled();
    });
  });

  describe('ViewItem', () => {
    it('EveryClaimState_KeepsViewItemTargetingStoreLink', () => {
      for (const overrides of [
        {},
        { viewerClaimed: true },
        { fullyClaimed: true, showPurchased: true },
        { isOwner: true },
      ]) {
        const { unmount } = renderCard({
          ...overrides,
          item: { id: 'i1', name: 'Gift', store: STORE } as never,
        });
        expect(
          screen.getByRole('link', { name: 'View item — opens in new tab' })
        ).toHaveAttribute('href', 'https://a.example');
        unmount();
      }
    });
  });

  describe('OwnerClaimAffordance', () => {
    it('HasClaimsAtClaims_RendersManageClaimsButton', () => {
      renderCard({ isOwner: true, tier: 'claims', hasAnyClaim: true });
      expect(
        screen.getByRole('button', { name: 'Manage claims' })
      ).toBeInTheDocument();
    });

    it('ClaimableAtIdentity_RendersAddClaimButton', () => {
      const { container } = renderCard({
        isOwner: true,
        item: { id: 'i1', name: 'Gift', store: STORE } as never,
      });
      expect(
        screen.getByRole('button', { name: 'Add Claim' })
      ).toBeInTheDocument();
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$35.50'
      );
    });
  });

  describe('SoftRemovedEntry', () => {
    const removedItem = {
      id: 'i1',
      name: 'Gift',
      description: '',
      image_url: '',
      store: null,
      removed: true,
    } as never;

    it('Viewer_RendersYourClaimStillStandsNote', () => {
      renderCard({ item: removedItem, acceptsClaims: false });
      expect(
        screen.getByText('Removed from this list — your claim still stands')
      ).toBeInTheDocument();
    });

    it('Owner_RendersKeptBecauseItCarriesClaimsNote', () => {
      renderCard({ item: removedItem, isOwner: true, acceptsClaims: false });
      expect(
        screen.getByText('Removed — kept because it carries claims')
      ).toBeInTheDocument();
    });

    it('ShownEntry_OmitsTheNote', () => {
      renderCard();
      expect(screen.queryByText(/^Removed/)).not.toBeInTheDocument();
    });
  });

  it('NoDescription_OmitsDescriptionParagraph', () => {
    const { container } = renderCard();
    expect(container.querySelector('.itemDescription')).toBeNull();
  });

  it('EmptyEntryLine_OmitsTheLine', () => {
    const { container } = renderCard({ entryLine: '' });
    expect(container.querySelector('.item-entry-line')).toBeNull();
  });

  describe('FullyClaimed', () => {
    it('FullyClaimed_ShowsStatus-KeepsPriceLine', () => {
      const { container } = renderCard({
        fullyClaimed: true,
        showPurchased: true,
        item: { id: 'i1', name: 'Gift', store: STORE } as never,
      });
      expect(screen.getByRole('status')).toHaveTextContent('Fully claimed');
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$35.50'
      );
    });

    it('FullyClaimedNoStore_RendersNoClickTarget', () => {
      renderCard({ fullyClaimed: true, showPurchased: true });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('ViewerClaimed', () => {
    it('RemovableClaim_RendersManageClaimButton', () => {
      const { container } = renderCard({
        viewerClaimed: true,
        item: { id: 'i1', name: 'Gift', store: STORE } as never,
      });
      expect(
        screen.getByRole('button', { name: 'Manage claim' })
      ).toBeInTheDocument();
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$35.50'
      );
    });

    it('ManageClick_FiresCallback', async () => {
      const user = userEvent.setup();
      const { props } = renderCard({ viewerClaimed: true });
      await user.click(screen.getByRole('button', { name: 'Manage claim' }));
      expect(props.onPurchaseClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('ViewOnly', () => {
    it('ViewOnlyWithStore_RendersOnlyLiveViewItemAnchor', () => {
      renderCard({
        viewOnly: true,
        onPurchaseClick: undefined,
        item: { id: 'i1', name: 'Gift', store: STORE } as never,
      });
      expect(
        screen.getByRole('link', { name: 'View item — opens in new tab' })
      ).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  it('PurchasedOrSpoiler_MarksItemPurchased', () => {
    const { container } = renderCard({ showSpoilerInfo: true });
    expect(container.querySelector('.item.purchased')).toBeInTheDocument();
  });

  it('CustomClassNameAndEmptyName_AppliesClassAndEmptyTitle', () => {
    const { container } = renderCard({
      className: 'extra',
      item: {
        id: 'i1',
        name: '',
        description: '',
        image_url: '',
        store: null,
      } as never,
    });
    const card = container.querySelector('.item.extra');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('title', '');
  });
});
