/* eslint-disable testing-library/no-node-access --
 * Modal's close affordance is a class-only `<div className="close-button">`
 * with no role, portaled to document.body.
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
  firstName: 'Vicky',
  claimedByViewer: true,
  purchasedAt: new Date(Date.now() - 2 * 86400000),
};
const attributedClaim: PurchaseView = {
  id: 'pa',
  by: 'other',
  firstName: 'Grandma',
  claimedByViewer: true,
};
const othersClaim: PurchaseView = {
  id: 'po',
  by: 'other',
  firstName: 'Frank',
  claimedByViewer: false,
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
    view: 'claim',
    claims: [],
    viewerIsPurchaser: false,
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
    ...overrides,
  };
  return { props, ...render(<PurchaseModalSlot {...props} />) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClaimPickerForItem).mockResolvedValue(null);
});

describe('PurchaseModalSlot', () => {
  describe('ManageView', () => {
    it('TwoViewerClaims_RendersOneRowPerClaimWithItsRemoveAction', () => {
      renderSlot({ view: 'manage', claims: [selfClaim, attributedClaim] });
      expect(screen.getByText('Vicky (you)')).toBeInTheDocument();
      expect(screen.getByText('Grandma')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Remove your claim' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: "Remove Grandma's claim" })
      ).toBeInTheDocument();
    });

    it('MixedRemovability_ListsOthersClaimWithoutRemoveAction', () => {
      renderSlot({
        view: 'manage',
        claims: [selfClaim, attributedClaim, othersClaim],
      });
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(screen.getByText('Frank')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: "Remove Frank's claim" })
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(
        2
      );
    });

    it('SelfClaimWithDate_RendersRelativeDateMetaLine', () => {
      renderSlot({ view: 'manage', claims: [selfClaim] });
      expect(screen.getByText('claimed 2 days ago')).toBeInTheDocument();
    });

    it('AttributedByViewerWithDate_MetaLineJoinsAttributionAndDate', () => {
      renderSlot({
        view: 'manage',
        claims: [
          { ...attributedClaim, purchasedAt: new Date(Date.now() - 2 * 86400000) },
        ],
      });
      expect(screen.getByText('Added by you · 2 days ago')).toBeInTheDocument();
    });

    it('AttributedByViewerNoDate_MetaLineIsAttributionAlone', () => {
      renderSlot({ view: 'manage', claims: [attributedClaim] });
      expect(screen.getByText('Added by you')).toBeInTheDocument();
    });

    it('SelfFallbackNameYou_RendersPlainYouNotYouYou', () => {
      renderSlot({
        view: 'manage',
        claims: [{ ...selfClaim, firstName: 'You', purchasedAt: undefined }],
      });
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.queryByText('You (you)')).not.toBeInTheDocument();
    });

    it('ManageView_RendersClaimedBySectionLabel', () => {
      renderSlot({ view: 'manage', claims: [selfClaim] });
      expect(screen.getByText('Claimed by')).toBeInTheDocument();
    });

    it('RemovableAfterOthers_SortsViewerRemovableRowsFirst', () => {
      renderSlot({ view: 'manage', claims: [othersClaim, selfClaim] });
      const rows = screen.getAllByRole('listitem');
      expect(rows[0]).toHaveTextContent('Vicky (you)');
      expect(rows[1]).toHaveTextContent('Frank');
    });

    it('ThirteenClaims_RendersTenRowsAndSeeMoreWithRemainingCount', () => {
      const many = Array.from({ length: 12 }, (_, i) => ({
        ...othersClaim,
        id: `pn${i}`,
        firstName: `Buyer${i}`,
      }));
      renderSlot({ view: 'manage', claims: [selfClaim, ...many] });
      expect(screen.getAllByRole('listitem')).toHaveLength(10);
      expect(
        screen.getByRole('button', { name: 'See more (3)' })
      ).toBeInTheDocument();
    });

    it('SeeMoreClick_RevealsNextBatch-RemovesExhaustedControl', async () => {
      const user = userEvent.setup();
      const many = Array.from({ length: 12 }, (_, i) => ({
        ...othersClaim,
        id: `pn${i}`,
        firstName: `Buyer${i}`,
      }));
      renderSlot({ view: 'manage', claims: [selfClaim, ...many] });
      await user.click(screen.getByRole('button', { name: 'See more (3)' }));
      expect(screen.getAllByRole('listitem')).toHaveLength(13);
      expect(
        screen.queryByRole('button', { name: /^See more/ })
      ).not.toBeInTheDocument();
    });

    it('ClaimsAtOrUnderBound_RendersNoSeeMoreControl', () => {
      renderSlot({ view: 'manage', claims: [selfClaim, attributedClaim] });
      expect(
        screen.queryByRole('button', { name: /^See more/ })
      ).not.toBeInTheDocument();
    });

    it('RemoveActivation_FiresOnRemoveClaimWithThatClaimOnly', async () => {
      const user = userEvent.setup();
      const { props } = renderSlot({
        view: 'manage',
        claims: [selfClaim, attributedClaim],
      });
      await user.click(
        screen.getByRole('button', { name: "Remove Grandma's claim" })
      );
      expect(props.onRemoveClaim).toHaveBeenCalledTimes(1);
      expect(props.onRemoveClaim).toHaveBeenCalledWith(attributedClaim);
    });

    it('SingleClaim_RendersTheSameListPresentation', () => {
      renderSlot({ view: 'manage', claims: [selfClaim] });
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(
        screen.getByRole('button', { name: 'Remove your claim' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Remove my claim' })
      ).not.toBeInTheDocument();
    });

    it('ManageView_StoreRowStillRendersLiveStoreLink', () => {
      renderSlot({ view: 'manage', claims: [selfClaim] });
      const link = screen.getByRole('link', { name: /Amazon/ });
      expect(link).toHaveAttribute('href', 'https://a.example');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('ManageView_HeaderShowsItemNameAndPrice', () => {
      renderSlot({ view: 'manage', claims: [selfClaim] });
      expect(
        screen.getByRole('heading', { name: 'Fancy Mug' })
      ).toBeInTheDocument();
      expect(screen.getByText('$35.50')).toBeInTheDocument();
    });
  });

  describe('ClaimView', () => {
    it('ViewerIsPurchaser_HidesSelfClaimCta-KeepsDisclosureCollapsed', async () => {
      renderSlot({
        user_id: 'viewer',
        claims: [selfClaim],
        viewerIsPurchaser: true,
      });
      expect(
        await screen.findByRole('button', { name: /Claiming for someone else/ })
      ).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.queryByRole('button', { name: 'Claim this gift' })
      ).not.toBeInTheDocument();
    });

    it('ViewerClaimerOnly_KeepsSelfClaimCta', async () => {
      renderSlot({
        user_id: 'viewer',
        claims: [attributedClaim],
        viewerIsPurchaser: false,
      });
      expect(
        await screen.findByRole('button', { name: 'Claim this gift' })
      ).toBeInTheDocument();
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
    const { props } = renderSlot({ view: 'manage', claims: [selfClaim] });
    // Modal portals to document.body, so the close affordance is outside the
    // render container.
    await user.click(
      document.body.querySelector('.close-button') as HTMLElement
    );
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
