import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Purchase from '../Purchase';

describe('Purchase', () => {
  describe('Disabled', () => {
    it('DefaultLabel_RendersFullyClaimedStatusWithoutClickTarget', () => {
      render(
        <Purchase
          purchasedBy={undefined}
          handlePurchaseClick={vi.fn()}
          disabled
        />
      );
      const status = screen.getByRole('status');
      expect(status).toHaveClass('claimed-state', 'claimed-state--fully');
      expect(status).toHaveTextContent('Fully claimed');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('CustomLabelAndClassName_RendersBothOnStatus', () => {
      render(
        <Purchase
          purchasedBy="Alice"
          handlePurchaseClick={vi.fn()}
          disabled
          className="row-claim"
          fullyClaimedLabel="3 of 3 claimed"
        />
      );
      const status = screen.getByRole('status');
      expect(status).toHaveClass('row-claim');
      expect(status).toHaveTextContent('3 of 3 claimed');
    });
  });

  describe('Claimed', () => {
    it('PurchasedByYou_RendersYouClaimedThisWithUndo', () => {
      render(<Purchase purchasedBy="You" handlePurchaseClick={vi.fn()} />);
      const button = screen.getByRole('button', {
        name: 'Remove your claim',
      });
      expect(button).toHaveTextContent('You claimed this');
      expect(button).toHaveTextContent('Undo');
    });

    it('UndoClick_CallsHandlerOnce', () => {
      const handleClick = vi.fn();
      render(<Purchase purchasedBy="You" handlePurchaseClick={handleClick} />);
      fireEvent.click(
        screen.getByRole('button', { name: 'Remove your claim' })
      );
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('PurchasedByOther_RendersClaimedWithBuyerName-AppliesClassName', () => {
      render(
        <Purchase
          purchasedBy="Alice"
          handlePurchaseClick={vi.fn()}
          className="row-claim"
        />
      );
      const button = screen.getByRole('button', {
        name: 'Remove your claim',
      });
      expect(button).toHaveTextContent('Claimed: Alice');
      expect(button).toHaveClass('row-claim');
    });
  });

  describe('Unclaimed', () => {
    it('NoPurchaser_RendersClaimCta', () => {
      render(
        <Purchase purchasedBy={undefined} handlePurchaseClick={vi.fn()} />
      );
      expect(
        screen.getByRole('button', { name: 'Claim this item' })
      ).toHaveTextContent('Claim this gift');
    });

    it('CtaClick_CallsHandlerOnce', () => {
      const handleClick = vi.fn();
      render(
        <Purchase purchasedBy={undefined} handlePurchaseClick={handleClick} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Claim this item' }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
