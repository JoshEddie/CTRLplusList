import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PreviewCard } from '../PreviewCard';
import type { ItemViewModel } from '../viewModel';
import { makeItem } from './test-helpers';

function vm(over: Partial<ItemViewModel> = {}): ItemViewModel {
  return makeItem(over);
}

describe('PreviewCard', () => {
  it('RendersTheRealItemCard_NameAsHeading', () => {
    render(<PreviewCard item={vm()} />);
    expect(
      screen.getByRole('heading', { name: 'Cast Iron Skillet' })
    ).toBeInTheDocument();
  });

  it('ValidStore_ShowsPriceLineAndLiveViewItemLink', () => {
    render(<PreviewCard item={vm()} />);
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText(/· Lodge/)).toBeInTheDocument();
    // The store affordance is the production View item anchor, exactly as it
    // appears on a list — not a lookalike text span.
    expect(
      screen.getByRole('link', { name: 'View item — opens in new tab' })
    ).toHaveAttribute('href', 'https://lodge');
  });

  it('NoValidStore_OmitsPriceExactlyAsProductionDoes', () => {
    render(
      <PreviewCard item={vm({ stores: [{ name: '', link: '', price: '' }] })} />
    );
    // Production omits price when there's no store; the preview must match.
    // The "add a price" nudge lives off the card (Store-links row), so the card
    // shows no price text — not a "Price not set" annotation it would never show.
    expect(screen.queryByText(/Price not set/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('StoreWithLinkButNoPrice_OmitsPriceNeverShowsZero', () => {
    render(
      <PreviewCard
        item={vm({
          stores: [{ name: 'Lodge', link: 'https://lodge', price: '' }],
        })}
      />
    );
    // A name+link store with no price is not yet valid — the card must omit it
    // entirely, never paint a misleading "$0.00". The "add a price" nudge lives
    // off the card on the Store-links row.
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('StoreWithExplicitZeroPrice_ShowsZero', () => {
    render(
      <PreviewCard
        item={vm({
          stores: [{ name: 'Freebie', link: 'https://free', price: '0.00' }],
        })}
      />
    );
    // A deliberately-entered $0.00 is a real price and renders as such.
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText(/· Freebie/)).toBeInTheDocument();
  });

  it('LegacyMultiStoreItem_ShowsOnlyTheCheapestStore', () => {
    render(
      <PreviewCard
        item={vm({
          stores: [
            { name: 'Amazon', link: 'https://a', price: '40.00' },
            { name: 'Lodge', link: 'https://l', price: '29.99' },
          ],
        })}
      />
    );
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText(/· Lodge/)).toBeInTheDocument();
    expect(screen.queryByText(/Amazon/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+1/)).not.toBeInTheDocument();
  });

  it('AtCapDescription_RendersInFullWithoutClamp', () => {
    const description = 'd'.repeat(100);
    render(<PreviewCard item={vm({ description })} />);
    const node = screen.getByText(description);
    expect(node).toBeInTheDocument();
    // The real card's description class carries no line-clamp.
    expect(node.className).toBe('itemDescription');
  });
});
