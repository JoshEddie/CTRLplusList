/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * `.itemDescription` and the `.item.purchased` wrapper are class-only with no
 * role, so presence/absence of those is asserted by class.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseView } from '@/lib/types';
import ItemCard from '../ItemCard';

const claim: PurchaseView = { id: 'p1', by: 'self', firstName: 'You' };

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
    myClaim: null,
    claimSummary: '',
    claimActionDisabled: false,
    showCounter: true,
    counterText: '0/3 claimed',
    onPurchaseClick: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ItemCard {...props} />) };
}

describe('ItemCard', () => {
  it('Viewer_RendersClaimAffordance-CounterAndDescription', () => {
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
      screen.getByRole('button', { name: 'Claim this item' })
    ).toBeInTheDocument();
    expect(screen.getByText('0/3 claimed')).toBeInTheDocument();
  });

  it('ClaimClick_FiresCallback', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Claim this item' }));
    expect(props.onPurchaseClick).toHaveBeenCalledTimes(1);
  });

  it('Owner_RendersNoClaimAffordance', () => {
    renderCard({ isOwner: true });
    expect(
      screen.queryByRole('button', { name: 'Claim this item' })
    ).not.toBeInTheDocument();
  });

  it('NoDescription_OmitsDescriptionParagraph', () => {
    const { container } = renderCard();
    expect(container.querySelector('.itemDescription')).toBeNull();
  });

  it('FullyClaimed_ShowsFullyClaimedLabel-HidesCounter', () => {
    renderCard({ claimActionDisabled: true, showPurchased: true });
    expect(screen.getByText('Fully claimed')).toBeInTheDocument();
    expect(screen.queryByText('0/3 claimed')).not.toBeInTheDocument();
  });

  it('PurchasedByOthers_LabelsClaimer', () => {
    renderCard({ showPurchased: true, claimSummary: 'Sam' });
    expect(screen.getByText('Claimed: Sam')).toBeInTheDocument();
  });

  it('PurchasedBySelf_LabelsYou', () => {
    renderCard({ showPurchased: true, myClaim: claim, claimSummary: 'You' });
    expect(screen.getByText('You claimed this')).toBeInTheDocument();
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
