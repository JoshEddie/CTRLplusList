import { ROLES } from '@/lib/data/profile.roles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClaimPickerForItem } from '@/lib/data/user.actions';
import { PurchaseView } from '@/lib/types';
import PurchaseModalSlot from '../PurchaseModalSlot';
import { makeProfile } from '@/test/helpers/profile';

// user.actions is a 'use server' module whose import chain reaches the DB
// driver; PurchaseFlowContainer only consumes the picker read.
vi.mock('@/lib/data/purchase.actions', () => ({
  claimSummaryForItem: vi.fn(),
}));

vi.mock('@/lib/data/user.actions', () => ({
  getClaimPickerForItem: vi.fn(),
  signInUser: vi.fn(),
}));

const selfClaim: PurchaseView = {
  id: 'pm',
  by: 'self',
  name: 'Vicky',
  claimedByViewer: true,
  purchasedAt: new Date(Date.now() - 2 * 86400000),
};
const attributedClaim: PurchaseView = {
  id: 'pa',
  by: 'other',
  name: 'Grandma',
  claimedByViewer: true,
};
const othersClaim: PurchaseView = {
  id: 'po',
  by: 'other',
  name: 'Frank',
  claimedByViewer: false,
};
// Somebody else's claim, recorded by a third party: the row the roster
// attributes and the viewer may not touch.
const attributedByAnother: PurchaseView = {
  id: 'pb',
  by: 'other',
  name: 'Priya',
  claimerName: 'Alice',
  claimedByViewer: false,
};

const ITEM = {
  id: 'i1',
  list_id: 'l1',
  name: 'Fancy Mug',
  description: '',
  image_url: '',
  store: { name: 'Amazon', link: 'https://a.example', price: '35.50' },
} as never;

const VIEWER = makeProfile('viewer', 'viewer', ROLES.owner);

function renderSlot(
  overrides: Partial<React.ComponentProps<typeof PurchaseModalSlot>> = {}
) {
  const props: React.ComponentProps<typeof PurchaseModalSlot> = {
    view: 'claim',
    claims: [],
    capacity: { quantity: 1, remaining: 1 },
    viewerIsPurchaser: false,
    actor: undefined,
    isOwner: false,
    tier: 'claims',
    item: ITEM,
    onClose: vi.fn(),
    onSelfClaim: vi.fn(),
    onAttributedClaim: vi.fn(),
    onGuestClaim: vi.fn(),
    onRemoveClaim: vi.fn(),
    onUpdateUnits: vi.fn(),
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
    // Capacity states a remainder at every tier, but below `claims` it is
    // subtracted from a withheld count — so the readout is the caller's to
    // gate, and its absence is what keeps a false zero off the screen.
    const multiUnit = {
      view: 'manage' as const,
      claims: [{ ...selfClaim, units: 2 }],
      capacity: { quantity: 4, remaining: 2 },
    };

    it('ClaimsTier_ManageRowSaysWhatIsAlreadyClaimed', () => {
      renderSlot({ ...multiUnit, tier: 'claims' });
      expect(screen.getByText('2 of 4 claimed')).toBeInTheDocument();
    });

    it('BelowClaimsTier_ManageRowSaysNothingAboutWhatIsClaimed', () => {
      renderSlot({ ...multiUnit, tier: 'surprise' });
      expect(screen.queryByText(/of 4 claimed/)).not.toBeInTheDocument();
    });

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

    /**
     * The view manages the viewer's own claims: everyone else on the item is a
     * count under the list, never a row. Below `claims` the payload carries no
     * other party at all, so the line falls away on the zero rather than on a
     * tier the view would have to read.
     */
    it('OtherPartysClaim_CountedUnderTheListRatherThanListed', () => {
      renderSlot({
        view: 'manage',
        claims: [selfClaim, attributedClaim, othersClaim],
      });
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.queryByText('Frank')).not.toBeInTheDocument();
      expect(screen.getByText('1 other claim')).toBeInTheDocument();
    });

    it('TwoOtherPartiesClaims_CountReadsPlural', () => {
      renderSlot({
        view: 'manage',
        claims: [selfClaim, othersClaim, { ...othersClaim, id: 'po2' }],
      });
      expect(screen.getByText('2 other claims')).toBeInTheDocument();
    });

    it('NoOtherPartysClaim_RendersNoCountLine', () => {
      renderSlot({ view: 'manage', claims: [selfClaim, attributedClaim] });
      expect(screen.queryByText(/other claim/)).not.toBeInTheDocument();
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
        claims: [{ ...selfClaim, name: 'You', purchasedAt: undefined }],
      });
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.queryByText('You (you)')).not.toBeInTheDocument();
    });

    it('ManageView_RendersClaimedBySectionLabel', () => {
      renderSlot({ view: 'manage', claims: [selfClaim] });
      expect(screen.getByText('Claimed by')).toBeInTheDocument();
    });

    // A dozen claims the viewer asserted on one entry: every one is theirs to
    // manage, so the bound is what keeps the list from rendering them at once.
    const thirteenHeld = [
      selfClaim,
      ...Array.from({ length: 12 }, (_, i) => ({
        ...attributedClaim,
        id: `pn${i}`,
        name: `Buyer${i}`,
      })),
    ];

    it('ThirteenClaims_RendersTenRowsAndSeeMoreWithRemainingCount', () => {
      renderSlot({ view: 'manage', claims: thirteenHeld });
      expect(screen.getAllByRole('listitem')).toHaveLength(10);
      expect(
        screen.getByRole('button', { name: 'See more (3)' })
      ).toBeInTheDocument();
    });

    it('SeeMoreClick_RevealsNextBatch-RemovesExhaustedControl', async () => {
      const user = userEvent.setup();
      renderSlot({ view: 'manage', claims: thirteenHeld });
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

    /**
     * The manage view lists the viewer's own claims, and removing one compares
     * the self-profile with no floor — so a `manager` keeps it operable. The
     * owner floor governs master unclaim, which is the owner's spoiler list in
     * `PurchaseFlowContainer`, not this one.
     */
    it('ManagerActor_KeepsTheViewersOwnRemovalOperable', () => {
      renderSlot({
        view: 'manage',
        actor: makeProfile('viewer', 'viewer', ROLES.manager),
        claims: [selfClaim],
      });

      expect(
        screen.getByRole('button', { name: 'Remove your claim' })
      ).toBeEnabled();
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

  /**
   * The opened banner: every claim on the entry, whoever holds it. The tier is
   * the consent, so nothing is asked here — the only thing the sheet decides is
   * which rows the viewer may act on.
   */
  describe('RosterView', () => {
    // Six wanted with five spoken for, against three listed rows: the count
    // line can only be the entry's own sum (ADR-0016), never a sum over these.
    const roster = {
      view: 'roster' as const,
      claims: [selfClaim, attributedClaim, othersClaim],
      capacity: { quantity: 6, remaining: 1 },
      actor: VIEWER,
    };

    // The sheet's own count line, told apart by its class from the identical
    // status every row's units control repeats.
    const rosterCount = () =>
      screen.queryByText(/claimed$/, { selector: '.claim-roster-count' })
        ?.textContent;

    it('AnyViewer_ListsEveryClaimWhoeverHoldsIt', () => {
      renderSlot(roster);
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(screen.getByText('Vicky (you)')).toBeInTheDocument();
      expect(screen.getByText('Grandma')).toBeInTheDocument();
      expect(screen.getByText('Frank')).toBeInTheDocument();
    });

    it('ClaimRecordedByAnother_RowNamesWhoAddedIt', () => {
      renderSlot({
        ...roster,
        claims: [{ ...othersClaim, claimerName: 'Alice' }],
      });
      expect(screen.getByText('Added by Alice')).toBeInTheDocument();
    });

    it('ClaimsTier_CountLineIsTheEntrysSumNotTheRowsListed', () => {
      renderSlot(roster);
      expect(rosterCount()).toBe('5 of 6 claimed');
    });

    // A deep link can reach the roster from under the tier that discloses the
    // count, and the entry's remainder there is subtracted from a number the
    // payload never carried.
    it('BelowClaimsTier_StatesNoCount', () => {
      renderSlot({ ...roster, tier: 'surprise' });
      expect(rosterCount()).toBeUndefined();
    });

    it('OffAList_StatesNoCount', () => {
      renderSlot({ ...roster, capacity: null });
      expect(rosterCount()).toBeUndefined();
    });

    it('Owner_EveryRowCarriesRemoveAndUnits', () => {
      renderSlot({ ...roster, isOwner: true });
      expect(
        screen.getAllByRole('button', { name: /^Remove/ })
      ).toHaveLength(3);
      expect(screen.getAllByRole('group', { name: 'Units' })).toHaveLength(3);
    });

    /**
     * Master unclaim keeps its admin floor: a manager acting as the owning
     * profile reads the roster whole and changes none of it. The units control
     * goes with the removal — moving a claim to zero IS removing it.
     */
    it('ManagerActingAsTheOwner_RowsAreListedWithRemovalDisabled', () => {
      renderSlot({
        ...roster,
        isOwner: true,
        actor: makeProfile('owner', 'owner', ROLES.manager),
      });
      for (const remove of screen.getAllByRole('button', { name: /^Remove/ })) {
        expect(remove).toBeDisabled();
      }
      expect(screen.queryByRole('group', { name: 'Units' })).toBeNull();
    });

    it('Holder_ActsOnTheirOwnAndAssertedRowsAndReadsTheRest', () => {
      renderSlot(roster);
      expect(
        screen.getByRole('button', { name: 'Remove your claim' })
      ).toBeEnabled();
      expect(
        screen.getByRole('button', { name: "Remove Grandma's claim" })
      ).toBeEnabled();
      expect(
        screen.queryByRole('button', { name: "Remove Frank's claim" })
      ).toBeNull();
    });

    it('Bystander_ReadsEveryRowAndActsOnNone', () => {
      renderSlot({ ...roster, claims: [othersClaim, attributedByAnother] });
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
      expect(screen.queryByRole('group', { name: 'Units' })).toBeNull();
    });

    // A signed-out guest's claim is overlaid as their own from the cookie
    // before any of this renders, so it reads and behaves like any holder's.
    it('GuestHolder_OwnRowIsLabelledYouAndCarriesRemoval', () => {
      renderSlot({
        ...roster,
        actor: undefined,
        claims: [{ ...selfClaim, name: 'Sam Guest' }, othersClaim],
      });
      expect(screen.getByText('Sam Guest (you)')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Remove your claim' })
      ).toBeEnabled();
      expect(
        screen.queryByRole('button', { name: "Remove Frank's claim" })
      ).toBeNull();
    });

    it('RemoveActivation_FiresOnRemoveClaimWithThatRowOnly', async () => {
      const user = userEvent.setup();
      const { props } = renderSlot({ ...roster, isOwner: true });
      await user.click(
        screen.getByRole('button', { name: "Remove Frank's claim" })
      );
      expect(props.onRemoveClaim).toHaveBeenCalledTimes(1);
      expect(props.onRemoveClaim).toHaveBeenCalledWith(othersClaim);
    });

    // A twelve-unit entry can carry more claims than a sheet should open with.
    it('ThirteenClaims_RendersTenRowsAndSeeMoreWithRemainingCount', () => {
      renderSlot({
        ...roster,
        claims: Array.from({ length: 13 }, (_, i) => ({
          ...othersClaim,
          id: `pn${i}`,
          name: `Buyer${i}`,
        })),
      });
      expect(screen.getAllByRole('listitem')).toHaveLength(10);
      expect(
        screen.getByRole('button', { name: 'See more (3)' })
      ).toBeInTheDocument();
    });

    it('RosterView_HeaderShowsItemNameAndPrice', () => {
      renderSlot(roster);
      expect(
        screen.getByRole('heading', { name: 'Fancy Mug' })
      ).toBeInTheDocument();
      expect(screen.getByText('$35.50')).toBeInTheDocument();
    });
  });

  describe('ClaimView', () => {
    it('ViewerIsPurchaser_HidesSelfClaimCta-KeepsDisclosureCollapsed', async () => {
      renderSlot({
        actor: VIEWER,
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
        actor: VIEWER,
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
    renderSlot({ actor: VIEWER });
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
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
