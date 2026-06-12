import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PurchaseView } from '@/lib/types';
import ClaimBanners from '../ClaimBanners';

const selfClaim: PurchaseView = {
  id: 'p1',
  by: 'self',
  firstName: 'You',
  claimedByViewer: true,
};
const samClaim: PurchaseView = {
  id: 'p2',
  by: 'other',
  firstName: 'Sam',
  claimedByViewer: false,
};
const joClaim: PurchaseView = {
  id: 'p3',
  by: 'other',
  firstName: 'Jo',
  claimedByViewer: false,
};
const grandmaClaim: PurchaseView = {
  id: 'p4',
  by: 'other',
  firstName: 'Grandma',
  claimedByViewer: true,
};

function renderBanners(
  overrides: Partial<React.ComponentProps<typeof ClaimBanners>> = {}
) {
  const props: React.ComponentProps<typeof ClaimBanners> = {
    showPurchased: false,
    myClaim: null,
    isOwner: false,
    showSpoilerInfo: false,
    claims: [],
    claimSummary: '',
    counterText: '1/3 claimed',
    ...overrides,
  };
  return { props, ...render(<ClaimBanners {...props} />) };
}

describe('ClaimBanners', () => {
  it('PurchasedByOthers_ShowsClaimedByNames', () => {
    renderBanners({
      showPurchased: true,
      claims: [samClaim, joClaim],
      claimSummary: 'Sam, Jo',
    });
    expect(screen.getByRole('status')).toHaveTextContent('Claimed by Sam, Jo');
  });

  it('PurchasedButMine_SuppressesOthersBanner', () => {
    renderBanners({
      showPurchased: true,
      myClaim: selfClaim,
      claims: [selfClaim],
    });
    expect(screen.queryByText(/Claimed by/)).not.toBeInTheDocument();
    expect(screen.getByText('You claimed this')).toBeInTheDocument();
  });

  it('SelfClaim_ShowsYouClaimedThis-WithoutUndoAffordance', () => {
    renderBanners({ myClaim: selfClaim });
    expect(screen.getByText('You claimed this')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ClaimedByViewerForOther_ShowsYouClaimedThisForFirstName', () => {
    renderBanners({ myClaim: grandmaClaim });
    expect(
      screen.getByText('You claimed this for Grandma')
    ).toBeInTheDocument();
  });

  it('OwnerWithMyClaim_OmitsMineBanner', () => {
    renderBanners({ myClaim: selfClaim, isOwner: true });
    expect(screen.queryByText('You claimed this')).not.toBeInTheDocument();
  });

  describe('Spoiler', () => {
    it('TwoClaims_RendersInformationalRowPerClaim-NoRemoveAffordance', () => {
      renderBanners({
        showSpoilerInfo: true,
        claims: [samClaim, joClaim],
      });
      expect(screen.getByText('Sam')).toBeInTheDocument();
      expect(screen.getByText('Jo')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('AttributedClaim_RendersAddedByClaimerFirstName', () => {
      renderBanners({
        showSpoilerInfo: true,
        claims: [{ ...grandmaClaim, claimerFirstName: 'Vicky' }],
      });
      expect(
        screen.getByText('Grandma — added by Vicky')
      ).toBeInTheDocument();
    });

    it('SelfClaim_LabelsRowYou', () => {
      renderBanners({ showSpoilerInfo: true, claims: [selfClaim] });
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('CounterText_RendersSpoilersPrefix', () => {
      renderBanners({ showSpoilerInfo: true, claims: [samClaim] });
      expect(screen.getByRole('status')).toHaveTextContent(
        'Spoilers: 1/3 claimed'
      );
    });
  });

  it('NoFlags_RendersNothing', () => {
    renderBanners();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
