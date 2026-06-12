import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Purchase from '../Purchase';

describe('Purchase', () => {
  describe('FullyClaimed', () => {
    it('FullyClaimed_RendersStatusPillWithoutClickTarget', () => {
      render(<Purchase fullyClaimed handlePurchaseClick={vi.fn()} />);
      const status = screen.getByRole('status');
      expect(status).toHaveClass('claimed-state', 'claimed-state--fully');
      expect(status).toHaveTextContent('Fully claimed');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('ClassName_AppliedToStatusPill', () => {
      render(
        <Purchase
          fullyClaimed
          handlePurchaseClick={vi.fn()}
          className="row-claim"
        />
      );
      expect(screen.getByRole('status')).toHaveClass('row-claim');
    });
  });

  describe('ViewerClaimed', () => {
    it('ViewerClaimed_RendersManageYourClaimGhostButton', () => {
      render(<Purchase viewerClaimed handlePurchaseClick={vi.fn()} />);
      expect(
        screen.getByRole('button', { name: 'Manage your claim' })
      ).toHaveClass('manage-claim-btn');
    });

    it('ManageClick_CallsHandlerOnce', () => {
      const handleClick = vi.fn();
      render(<Purchase viewerClaimed handlePurchaseClick={handleClick} />);
      fireEvent.click(screen.getByRole('button', { name: 'Manage your claim' }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('ViewerClaimedAndFullyClaimed_ManageWinsOverDisabledPill', () => {
      render(
        <Purchase viewerClaimed fullyClaimed handlePurchaseClick={vi.fn()} />
      );
      expect(
        screen.getByRole('button', { name: 'Manage your claim' })
      ).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('OwnerClaim', () => {
    it('OwnerClaim_RendersMarkAsClaimedLabel', () => {
      render(<Purchase ownerClaim handlePurchaseClick={vi.fn()} />);
      expect(
        screen.getByRole('button', { name: 'Mark as claimed' })
      ).toBeInTheDocument();
    });
  });

  describe('Unclaimed', () => {
    it('Unclaimed_RendersGetThisGiftCta', () => {
      render(<Purchase handlePurchaseClick={vi.fn()} />);
      expect(
        screen.getByRole('button', { name: 'Get this gift' })
      ).toHaveTextContent('Get this gift');
    });

    it('CtaClick_CallsHandlerOnce', () => {
      const handleClick = vi.fn();
      render(<Purchase handlePurchaseClick={handleClick} />);
      fireEvent.click(screen.getByRole('button', { name: 'Get this gift' }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
