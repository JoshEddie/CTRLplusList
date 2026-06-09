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
    it('PurchasedByYou_RendersYouClaimedThisWithUndo-ClickCallsHandler', () => {
      const handleClick = vi.fn();
      render(<Purchase purchasedBy="You" handlePurchaseClick={handleClick} />);
      const button = screen.getByRole('button', {
        name: 'Remove your claim',
      });
      expect(button).toHaveTextContent('You claimed this');
      expect(button).toHaveTextContent('Undo');
      fireEvent.click(button);
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
    it('NoPurchaser_RendersClaimCta-ClickCallsHandler', () => {
      const handleClick = vi.fn();
      render(
        <Purchase purchasedBy={undefined} handlePurchaseClick={handleClick} />
      );
      const cta = screen.getByRole('button', { name: 'Claim this item' });
      expect(cta).toHaveTextContent('Claim this gift');
      fireEvent.click(cta);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
