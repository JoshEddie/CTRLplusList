/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * `.itemDescription`, the `.item.purchased` wrapper, and the inert metadata
 * line are class-only with no role, so presence/absence is asserted by class.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseView } from '@/lib/types';
import ItemCard from '../ItemCard';

const claim: PurchaseView = {
  id: 'p1',
  by: 'self',
  firstName: 'You',
  claimedByViewer: true,
};

const STORES = [
  { name: 'Target', link: 'https://t.example', price: '38.00' },
  { name: 'Amazon', link: 'https://a.example', price: '35.50' },
  { name: 'Etsy', link: 'https://e.example', price: '41.00' },
];

function renderCard(
  overrides: Partial<React.ComponentProps<typeof ItemCard>> = {}
) {
  const props: React.ComponentProps<typeof ItemCard> = {
    item: {
      id: 'i1',
      name: 'Gift',
      description: '',
      image_url: '',
      stores: [],
    } as never,
    className: undefined,
    isOwner: false,
    showPurchased: false,
    showSpoilerInfo: false,
    removableClaim: null,
    claimActionDisabled: false,
    showCounter: true,
    counterText: '0/3 claimed',
    showOwnerClaimAction: false,
    showOwnerManageAction: false,
    onPurchaseClick: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ItemCard {...props} />) };
}

describe('ItemCard', () => {
  it('Viewer_RendersGetThisGift-CounterAndDescription', () => {
    renderCard({
      item: {
        id: 'i1',
        name: 'Gift',
        description: 'A nice mug',
        image_url: '',
        stores: [],
      } as never,
    });
    expect(screen.getByText('A nice mug')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Get this gift' })
    ).toBeInTheDocument();
    expect(screen.getByText('0/3 claimed')).toBeInTheDocument();
  });

  it('ClaimClick_FiresCallbackOnce', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Get this gift' }));
    expect(props.onPurchaseClick).toHaveBeenCalledTimes(1);
  });

  describe('StoreMetadata', () => {
    it('Viewer_RendersInertMetadataLine-NoChipRow', () => {
      const { container } = renderCard({
        item: { id: 'i1', name: 'Gift', stores: STORES } as never,
      });
      const metadata = container.querySelector('.item-store-metadata');
      expect(metadata).toHaveTextContent('· Amazon · Target +1');
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$35.50'
      );
      expect(container.querySelector('.storeLinks')).toBeNull();
      expect(metadata?.closest('a, button')).toBeNull();
    });

    it('CardBodyTap_DoesNotOpenModal', async () => {
      const user = userEvent.setup();
      const { props, container } = renderCard({
        item: { id: 'i1', name: 'Gift', stores: STORES } as never,
      });
      await user.click(
        container.querySelector('.item-store-metadata') as HTMLElement
      );
      await user.click(container.querySelector('.itemName') as HTMLElement);
      expect(props.onPurchaseClick).not.toHaveBeenCalled();
    });

    it('Owner_RendersChipRow-NoMetadataLine', () => {
      const { container } = renderCard({
        isOwner: true,
        item: { id: 'i1', name: 'Gift', stores: STORES } as never,
      });
      expect(container.querySelector('.storeLinks')).toBeInTheDocument();
      expect(container.querySelector('.item-store-metadata')).toBeNull();
    });
  });

  describe('OwnerClaimGate', () => {
    it('ShowOwnerClaimActionFalse_OmitsClaimButton', () => {
      renderCard({ isOwner: true, showOwnerClaimAction: false });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('ShowOwnerClaimActionTrue_RendersMarkAsClaimedButton-HidesChipRow', () => {
      const { container } = renderCard({
        isOwner: true,
        showOwnerClaimAction: true,
        item: { id: 'i1', name: 'Gift', stores: STORES } as never,
      });
      expect(
        screen.getByRole('button', { name: 'Mark as claimed' })
      ).toBeInTheDocument();
      expect(container.querySelector('.storeLinks')).toBeNull();
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$35.50'
      );
    });

  });

  it('NoDescription_OmitsDescriptionParagraph', () => {
    const { container } = renderCard();
    expect(container.querySelector('.itemDescription')).toBeNull();
  });

  describe('FullyClaimed', () => {
    it('FullyClaimed_ShowsDisabledPill-HidesCounterAndMetadata', () => {
      const { container } = renderCard({
        claimActionDisabled: true,
        showPurchased: true,
        item: { id: 'i1', name: 'Gift', stores: STORES } as never,
      });
      expect(screen.getByRole('status')).toHaveTextContent('Fully claimed');
      expect(screen.queryByText('0/3 claimed')).not.toBeInTheDocument();
      expect(container.querySelector('.item-store-metadata')).toBeNull();
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$35.50'
      );
    });

    it('FullyClaimed_RendersNoClickTarget', () => {
      renderCard({ claimActionDisabled: true, showPurchased: true });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('ViewerClaimed', () => {
    it('RemovableClaim_RendersPlainPriceAndManageButton-NoMetadata', () => {
      const { container } = renderCard({
        removableClaim: claim,
        item: { id: 'i1', name: 'Gift', stores: STORES } as never,
      });
      expect(
        screen.getByRole('button', { name: 'Manage your claim' })
      ).toBeInTheDocument();
      expect(container.querySelector('.item-price')).toHaveTextContent(
        '$35.50'
      );
      expect(container.querySelector('.item-store-metadata')).toBeNull();
    });

    it('ManageClick_FiresCallback', async () => {
      const user = userEvent.setup();
      const { props } = renderCard({ removableClaim: claim });
      await user.click(
        screen.getByRole('button', { name: 'Manage your claim' })
      );
      expect(props.onPurchaseClick).toHaveBeenCalledTimes(1);
    });
  });

  it('PurchasedOrSpoiler_MarksItemPurchased', () => {
    const { container } = renderCard({ showSpoilerInfo: true });
    expect(container.querySelector('.item.purchased')).toBeInTheDocument();
  });

  it('CustomClassNameAndEmptyName_AppliesClassAndEmptyTitle', () => {
    const { container } = renderCard({
      className: 'extra',
      item: { id: 'i1', name: '', description: '', image_url: '', stores: [] } as never,
    });
    const card = container.querySelector('.item.extra');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('title', '');
  });
});
