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
    myClaims: [],
    isOwner: false,
    tier: 'identity',
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
      myClaims: [selfClaim],
      claims: [selfClaim],
    });
    expect(screen.queryByText(/Claimed by/)).not.toBeInTheDocument();
    expect(screen.getByText('You claimed this')).toBeInTheDocument();
  });

  it('SelfClaim_ShowsYouClaimedThis-WithoutUndoAffordance', () => {
    renderBanners({ myClaims: [selfClaim] });
    expect(screen.getByText('You claimed this')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ClaimedByViewerForOther_ShowsYouClaimedThisForFirstName', () => {
    renderBanners({ myClaims: [grandmaClaim] });
    expect(
      screen.getByText('You claimed this for Grandma')
    ).toBeInTheDocument();
  });

  it('TwoAttributedClaims_EnumeratesBothNames', () => {
    renderBanners({
      myClaims: [grandmaClaim, { ...joClaim, claimedByViewer: true }],
    });
    expect(
      screen.getByText('You claimed this for Grandma, Jo')
    ).toBeInTheDocument();
  });

  it('SelfPlusAttributedClaims_EnumeratesSelfAndNames', () => {
    renderBanners({ myClaims: [selfClaim, grandmaClaim] });
    expect(
      screen.getByText('You claimed this, and for Grandma')
    ).toBeInTheDocument();
  });

  it('OwnerWithMyClaim_OmitsMineBanner', () => {
    renderBanners({ myClaims: [selfClaim], isOwner: true });
    expect(screen.queryByText('You claimed this')).not.toBeInTheDocument();
  });

  // The owner spoiler banner is computed internally: it shows only when the
  // viewer is the owner, the item carries claims, and the tier is `claims` or
  // above. The claiming parties are named only at `identity`.
  describe('Spoiler', () => {
    describe('AtIdentity', () => {
      const ownerAtIdentity = { isOwner: true, tier: 'identity' as const };

      it('TwoClaims_RendersInformationalRowPerClaim-NoRemoveAffordance', () => {
        renderBanners({ ...ownerAtIdentity, claims: [samClaim, joClaim] });
        expect(screen.getByText('Sam')).toBeInTheDocument();
        expect(screen.getByText('Jo')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });

      it('AttributedClaim_RendersAddedByClaimerFirstName', () => {
        renderBanners({
          ...ownerAtIdentity,
          claims: [{ ...grandmaClaim, claimerFirstName: 'Vicky' }],
        });
        expect(
          screen.getByText('Grandma — added by Vicky')
        ).toBeInTheDocument();
      });

      it('SelfClaim_LabelsRowYou', () => {
        renderBanners({ ...ownerAtIdentity, claims: [selfClaim] });
        expect(screen.getByText('You')).toBeInTheDocument();
      });

      it('CounterText_RendersSpoilersPrefix', () => {
        renderBanners({ ...ownerAtIdentity, claims: [samClaim] });
        expect(screen.getByRole('status')).toHaveTextContent(
          'Spoilers: 1/3 claimed'
        );
      });
    });

    it('OwnerAtClaims_RendersCounterWithoutNamingParties', () => {
      renderBanners({
        isOwner: true,
        tier: 'claims',
        claims: [samClaim, joClaim],
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        'Spoilers: 1/3 claimed'
      );
      expect(screen.queryByText('Sam')).not.toBeInTheDocument();
      expect(screen.queryByText('Jo')).not.toBeInTheDocument();
    });

    it.each(['surprise', 'progress'] as const)(
      'OwnerBelowClaimsAt%s_RendersNoSpoilerBanner',
      (tier) => {
        renderBanners({ isOwner: true, tier, claims: [samClaim, joClaim] });
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      }
    );

    it('NonOwnerAtIdentity_RendersNoSpoilerBanner', () => {
      renderBanners({ isOwner: false, tier: 'identity', claims: [samClaim] });
      expect(screen.queryByText(/Spoilers:/)).not.toBeInTheDocument();
    });
  });

  it('NoFlags_RendersNothing', () => {
    renderBanners();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

// A claim the viewer holds is disclosed in full at every level, so it always
// carries a name — except on an optimistic row assembled before the server
// answers, where the fallback keeps the label total.
it('AttributedOwnClaimWithoutAName_LabelsItSomeone', () => {
  renderBanners({
    myClaims: [
      { id: 'p9', by: 'other', claimedByViewer: true },
    ],
  });

  expect(screen.getByRole('status')).toHaveTextContent(
    'You claimed this for Someone'
  );
});
