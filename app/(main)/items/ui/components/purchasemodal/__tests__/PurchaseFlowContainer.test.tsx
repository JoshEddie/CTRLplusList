import { ROLES } from '@/lib/data/profile.roles';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { claimSummaryForEntry } from '@/lib/data/purchase.actions';
import { getClaimPickerForItem } from '@/lib/data/user.actions';
import { PurchaseView } from '@/lib/types';
import PurchaseFlowContainer from '../PurchaseFlowContainer';
import { makeProfile } from '@/test/helpers/profile';

// user.actions is a 'use server' module whose import chain reaches the DB
// driver; the picker read and the sign-in action are the only contracts the
// modal consumes.
vi.mock('@/lib/data/purchase.actions', () => ({
  claimSummaryForEntry: vi.fn(),
}));

vi.mock('@/lib/data/user.actions', () => ({
  getClaimPickerForItem: vi.fn(),
  signInUser: vi.fn(),
}));

const face = { accent: null, art: null, avatarStyle: null };
const PICKER = {
  ownerName: 'Olivia Owner',
  pool: [
    { id: 'u2', name: 'Sam Smith', ...face },
    { id: 'u3', name: 'Jo Jones', ...face },
  ],
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

const OTHERS_CLAIM: PurchaseView = {
  id: 'pc1',
  by: 'other',
  name: 'Bob',
  claimerName: 'Alice',
  claimedByViewer: false,
};

function renderContainer(
  overrides: Partial<React.ComponentProps<typeof PurchaseFlowContainer>> = {}
) {
  const props: React.ComponentProps<typeof PurchaseFlowContainer> = {
    actor: VIEWER,
    isOwner: false,
    tier: 'claims',
    claims: [],
    capacity: { quantity: 1, remaining: 1 },
    item: ITEM,
    onSelfClaim: vi.fn(),
    onAttributedClaim: vi.fn(),
    onGuestClaim: vi.fn(),
    onRemoveClaim: vi.fn(),
    onUpdateUnits: vi.fn(),
    ...overrides,
  };
  render(<PurchaseFlowContainer {...props} />);
  return props;
}

const disclosureTrigger = (name = 'Claiming for someone else?') =>
  screen.getByRole('button', { name: new RegExp(name.replace('?', '\\?')) });

async function expandLoadedDisclosure(
  user: ReturnType<typeof userEvent.setup>
) {
  await screen.findByRole('button', { name: 'Claim this gift' });
  await user.click(disclosureTrigger());
  return screen.findByRole('button', { name: /Sam Smith/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClaimPickerForItem).mockResolvedValue(PICKER);
  vi.mocked(claimSummaryForEntry).mockResolvedValue({
    claimedUnits: 0,
    remaining: 1,
  });
});

describe('PurchaseFlowContainer', () => {
  describe('StoreRow', () => {
    it('Authenticated_RendersStoreAsNewTabGhostLink', () => {
      renderContainer();
      const link = screen.getByRole('link', { name: /Amazon/ });
      expect(link).toHaveAttribute('href', 'https://a.example');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    });

    it('Guest_StoreRowRendersWithoutSignIn', () => {
      renderContainer({ actor: undefined });
      expect(screen.getByRole('link', { name: /Amazon/ })).toBeInTheDocument();
    });

    it('OwnerBelowClaims_StoreRowRenders', () => {
      renderContainer({ isOwner: true, tier: 'surprise' });
      expect(screen.getByRole('link', { name: /Amazon/ })).toBeInTheDocument();
    });

    it('NoValidStore_RendersClaimSectionWithoutStoreRow', async () => {
      renderContainer({
        item: { ...((ITEM as object) ?? {}), store: null } as never,
      });
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: 'Claim this gift' })
      ).toBeInTheDocument();
    });
  });

  describe('Guest', () => {
    it('NoProfileId_RendersGuestFieldAndFooterSignIn-NoPickerFetch', () => {
      renderContainer({ actor: undefined });
      expect(screen.getByLabelText('Your name')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Claim as Guest' })
      ).toBeInTheDocument();
      expect(screen.getByText(/Have an account\?/)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Sign in' })
      ).toBeInTheDocument();
      expect(getClaimPickerForItem).not.toHaveBeenCalled();
    });

    it('EmptyGuestName_ClaimAsGuestDisabled-NoCallback', async () => {
      const user = userEvent.setup();
      const { onGuestClaim } = renderContainer({ actor: undefined });
      const guestBtn = screen.getByRole('button', { name: 'Claim as Guest' });
      expect(guestBtn).toBeDisabled();
      await user.click(guestBtn);
      expect(onGuestClaim).not.toHaveBeenCalled();
    });

    it('PaddedGuestName_CallsOnGuestClaimTrimmed', async () => {
      const user = userEvent.setup();
      const { onGuestClaim } = renderContainer({ actor: undefined });
      await user.type(screen.getByLabelText('Your name'), '  Bob  ');
      await user.click(screen.getByRole('button', { name: 'Claim as Guest' }));
      expect(onGuestClaim).toHaveBeenCalledWith('Bob', 1);
    });
  });

  describe('Authenticated', () => {
    it('Render_ShowsItemHeader-PrimarySelfClaim-CollapsedDisclosure', async () => {
      renderContainer();
      expect(
        screen.getByRole('heading', { name: 'Fancy Mug' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Claim this gift' })
      ).toBeInTheDocument();
      const trigger = disclosureTrigger();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(
        await screen.findByText(/Claiming for someone else\?/)
      ).toBeInTheDocument();
    });

    it('SelfClaimClick_CallsOnSelfClaim-NoDisclosureInteractionNeeded', async () => {
      const user = userEvent.setup();
      const { onSelfClaim } = renderContainer();
      await user.click(screen.getByRole('button', { name: 'Claim this gift' }));
      expect(onSelfClaim).toHaveBeenCalledTimes(1);
    });

    it('ExpandBeforeLoad_ShowsOwnerScopedLoadingRow', async () => {
      vi.mocked(getClaimPickerForItem).mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderContainer();
      await user.click(disclosureTrigger());
      expect(
        screen.getByText("Loading the owner's circle…")
      ).toBeInTheDocument();
    });

    it('ExpandAfterLoad_ShowsSearchAndPoolRows', async () => {
      const user = userEvent.setup();
      renderContainer();
      await expandLoadedDisclosure(user);
      expect(
        screen.getByPlaceholderText("Search Olivia's circle…")
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Jo Jones/ })
      ).toBeInTheDocument();
    });

    it('PoolRowSelectThenConfirm_CallsOnAttributedClaim', async () => {
      const user = userEvent.setup();
      const { onAttributedClaim } = renderContainer();
      const samRow = await expandLoadedDisclosure(user);
      expect(
        screen.queryByRole('button', { name: /Confirm —/ })
      ).not.toBeInTheDocument();
      await user.click(samRow);
      await user.click(
        screen.getByRole('button', { name: 'Confirm — Sam Smith' })
      );
      expect(onAttributedClaim).toHaveBeenCalledWith(PICKER.pool[0], 1);
    });

    it('SelectedRowSecondClick_DeselectsAndHidesConfirm', async () => {
      const user = userEvent.setup();
      renderContainer();
      const samRow = await expandLoadedDisclosure(user);
      await user.click(samRow);
      await user.click(
        screen.getByRole('button', { name: /Sam Smith/, pressed: true })
      );
      expect(
        screen.queryByRole('button', { name: /Confirm —/ })
      ).not.toBeInTheDocument();
    });

    it('SearchQuery_NarrowsPoolRowsCaseInsensitive', async () => {
      const user = userEvent.setup();
      renderContainer();
      await expandLoadedDisclosure(user);
      await user.type(screen.getByRole('searchbox'), 'JO');
      expect(
        screen.getByRole('button', { name: /Jo Jones/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Sam Smith/ })
      ).not.toBeInTheDocument();
    });

    it('SearchNoMatch_DirectsToFreeTextFallback', async () => {
      const user = userEvent.setup();
      renderContainer();
      await expandLoadedDisclosure(user);
      await user.type(screen.getByRole('searchbox'), 'zzz');
      expect(
        screen.getByText('No one by that name — add them below')
      ).toBeInTheDocument();
    });

    it('FreeTextConfirm_CallsOnGuestClaimTrimmed', async () => {
      const user = userEvent.setup();
      const { onGuestClaim } = renderContainer();
      await expandLoadedDisclosure(user);
      await user.type(
        screen.getByLabelText('Someone not listed?'),
        ' Aunt May '
      );
      await user.click(
        screen.getByRole('button', { name: 'Confirm — Aunt May' })
      );
      expect(onGuestClaim).toHaveBeenCalledWith('Aunt May', 1);
    });

    it('SelectionAndFreeText_MutuallyExclusive', async () => {
      const user = userEvent.setup();
      renderContainer();
      const samRow = await expandLoadedDisclosure(user);
      await user.click(samRow);
      await user.type(screen.getByLabelText('Someone not listed?'), 'Aunt');
      expect(
        screen.getByRole('button', { name: 'Confirm — Aunt' })
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Sam Smith/ }));
      expect(screen.getByLabelText('Someone not listed?')).toHaveValue('');
      expect(
        screen.getByRole('button', { name: 'Confirm — Sam Smith' })
      ).toBeInTheDocument();
    });

    it('CollapseDisclosure_ResetsSearchSelectionAndFreeText', async () => {
      const user = userEvent.setup();
      renderContainer();
      const samRow = await expandLoadedDisclosure(user);
      await user.click(samRow);
      await user.type(screen.getByRole('searchbox'), 'Sam');
      await user.click(disclosureTrigger());
      await user.click(disclosureTrigger());
      expect(screen.getByRole('searchbox')).toHaveValue('');
      expect(
        screen.queryByRole('button', { name: /Confirm —/ })
      ).not.toBeInTheDocument();
    });

    it('PickerFetchRejects_ShowsErrorWithRetry-NotEmptyPool', async () => {
      vi.mocked(getClaimPickerForItem).mockRejectedValue(
        new Error('network down')
      );
      const user = userEvent.setup();
      renderContainer();
      await user.click(disclosureTrigger());
      expect(
        await screen.findByText("Couldn't load the owner's circle")
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText('Someone not listed?')
      ).not.toBeInTheDocument();
    });

    it('RetryAfterFailure_RecoversThePicker', async () => {
      vi.mocked(getClaimPickerForItem)
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(PICKER);
      const user = userEvent.setup();
      renderContainer();
      await user.click(disclosureTrigger());
      await screen.findByText("Couldn't load the owner's circle");
      await user.click(screen.getByRole('button', { name: 'Retry' }));
      expect(
        await screen.findByRole('button', { name: /Sam Smith/ })
      ).toBeInTheDocument();
      expect(getClaimPickerForItem).toHaveBeenCalledTimes(2);
    });

    it('ItemChangesMidFlight_StaleResolutionDiscarded', async () => {
      let resolveStale!: (p: typeof PICKER) => void;
      vi.mocked(getClaimPickerForItem)
        .mockReturnValueOnce(
          new Promise((res) => {
            resolveStale = res;
          })
        )
        .mockResolvedValueOnce({
          ownerName: 'Fresh Fiona',
          pool: [{ id: 'u7', name: 'Fresh Fred', ...face }],
        });
      const user = userEvent.setup();
      const props: React.ComponentProps<typeof PurchaseFlowContainer> = {
        actor: VIEWER,
        isOwner: false,
        tier: 'claims',
        claims: [],
        capacity: { quantity: 1, remaining: 1 },
        item: ITEM,
        onSelfClaim: vi.fn(),
        onAttributedClaim: vi.fn(),
        onGuestClaim: vi.fn(),
        onRemoveClaim: vi.fn(),
        onUpdateUnits: vi.fn(),
      };
      const { rerender } = render(<PurchaseFlowContainer {...props} />);
      rerender(
        <PurchaseFlowContainer
          {...props}
          item={{ ...(ITEM as object), id: 'i2' } as never}
        />
      );
      await user.click(disclosureTrigger());
      expect(
        await screen.findByRole('button', { name: /Fresh Fred/ })
      ).toBeInTheDocument();
      await act(async () => {
        resolveStale(PICKER);
      });
      expect(
        screen.queryByRole('button', { name: /Sam Smith/ })
      ).not.toBeInTheDocument();
    });

    it('ItemChangesMidFlight_StaleRejectionDoesNotPoisonFreshPicker', async () => {
      let rejectStale!: (e: Error) => void;
      vi.mocked(getClaimPickerForItem)
        .mockReturnValueOnce(
          new Promise((_res, rej) => {
            rejectStale = rej;
          })
        )
        .mockResolvedValueOnce(PICKER);
      const user = userEvent.setup();
      const props: React.ComponentProps<typeof PurchaseFlowContainer> = {
        actor: VIEWER,
        isOwner: false,
        tier: 'claims',
        claims: [],
        capacity: { quantity: 1, remaining: 1 },
        item: ITEM,
        onSelfClaim: vi.fn(),
        onAttributedClaim: vi.fn(),
        onGuestClaim: vi.fn(),
        onRemoveClaim: vi.fn(),
        onUpdateUnits: vi.fn(),
      };
      const { rerender } = render(<PurchaseFlowContainer {...props} />);
      rerender(
        <PurchaseFlowContainer
          {...props}
          item={{ ...(ITEM as object), id: 'i2' } as never}
        />
      );
      await user.click(disclosureTrigger());
      await screen.findByRole('button', { name: /Sam Smith/ });
      await act(async () => {
        rejectStale(new Error('stale failure'));
      });
      expect(screen.queryByText(/Couldn't load/)).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Sam Smith/ })
      ).toBeInTheDocument();
    });

    it('EmptyPool_RendersOnlyFreeTextFallback', async () => {
      vi.mocked(getClaimPickerForItem).mockResolvedValue({
        ownerName: 'Olivia Owner',
        pool: [],
      });
      const user = userEvent.setup();
      renderContainer();
      await screen.findByRole('button', { name: 'Claim this gift' });
      await user.click(disclosureTrigger());
      expect(
        await screen.findByLabelText('Someone not listed?')
      ).toBeInTheDocument();
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/Couldn't load/)).not.toBeInTheDocument();
    });
  });

  // No entry, no claim — inside the modal too. `?purchaseItem=` can open this
  // on the item library, which names no list, and a CTA there would dispatch a
  // write that cannot land.
  describe('NoEntry', () => {
    const noEntry = {
      ...((ITEM as object) ?? {}),
      list_id: undefined,
    } as never;

    it('Authenticated_RendersNoSelfClaimCtaOrDisclosure', async () => {
      renderContainer({ item: noEntry });

      expect(
        await screen.findByRole('link', { name: /Amazon/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Claim this gift' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Claiming for someone/ })
      ).not.toBeInTheDocument();
    });

    it('SignedOut_RendersNoGuestClaimField', () => {
      renderContainer({ item: noEntry, actor: undefined });

      expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();
    });
  });

  describe('Owner', () => {
    // Claim affordances are ungoverned by spoiler state: the owner reaches the
    // flow at every level, and only the disclosure the modal renders differs.
    it('BelowClaims_RendersOwnerCtaAfterTheRevealFetch', async () => {
      vi.mocked(claimSummaryForEntry).mockResolvedValue({
        claimedUnits: 2,
        remaining: 1,
      });
      renderContainer({ isOwner: true, tier: 'surprise' });
      // The reveal summary discloses only claimed units and the remaining
      // capacity — it names no party, and neither number is a person count.
      expect(await screen.findByText('2 claimed · 1 left')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'I bought this myself' })
      ).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });

    it('BelowClaimsItemWithoutAnId_SkipsTheRevealFetch', () => {
      renderContainer({
        isOwner: true,
        tier: 'surprise',
        item: { ...((ITEM as object) ?? {}), id: '' } as never,
      });

      expect(claimSummaryForEntry).not.toHaveBeenCalled();
    });

    it('BelowClaimsSummaryUnresolved_StillOffersTheClaimCta', () => {
      vi.mocked(claimSummaryForEntry).mockReturnValue(new Promise(() => {}));
      renderContainer({ isOwner: true, tier: 'surprise' });

      expect(
        screen.getByRole('button', { name: 'I bought this myself' })
      ).toBeInTheDocument();
    });

    it('BelowClaimsUnclaimedEntry_ReportsNoClaimsRatherThanAFraction', async () => {
      vi.mocked(claimSummaryForEntry).mockResolvedValue({
        claimedUnits: 0,
        remaining: 4,
      });
      renderContainer({ isOwner: true, tier: 'surprise' });

      expect(
        await screen.findByText('No claims on this item yet.')
      ).toBeInTheDocument();
    });

    it('BelowClaimsEntryWithoutAList_SkipsTheRevealFetch', () => {
      renderContainer({
        isOwner: true,
        tier: 'surprise',
        item: { ...((ITEM as object) ?? {}), list_id: undefined } as never,
      });

      expect(claimSummaryForEntry).not.toHaveBeenCalled();
    });

    it('BelowClaimsNoCapacityLeft_SuppressesTheClaimCta', async () => {
      vi.mocked(claimSummaryForEntry).mockResolvedValue({
        claimedUnits: 3,
        remaining: 0,
      });
      renderContainer({ isOwner: true, tier: 'surprise' });
      // A full entry says so plainly rather than offering a "0 left" fraction,
      // the same rule the card counter follows.
      expect(await screen.findByText('Fully claimed')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'I bought this myself' })
      ).not.toBeInTheDocument();
    });

    it('LevelIdentity_RendersOwnerCtaAndOwnerDisclosure', async () => {
      const user = userEvent.setup();
      const { onSelfClaim } = renderContainer({
        isOwner: true,
      });
      await user.click(
        screen.getByRole('button', { name: 'I bought this myself' })
      );
      expect(onSelfClaim).toHaveBeenCalledTimes(1);
      await user.click(disclosureTrigger('Claiming for someone?'));
      expect(
        await screen.findByPlaceholderText('Search your circle…')
      ).toBeInTheDocument();
    });

    it('LevelIdentity_OwnerClaimsListRemove-DispatchesOnRemoveClaim', async () => {
      const user = userEvent.setup();
      const claim: PurchaseView = {
        id: 'pc1',
        by: 'other',
        name: 'Bob',
        claimerName: 'Alice',
        claimedByViewer: false,
      };
      const { onRemoveClaim } = renderContainer({
        isOwner: true,
        claims: [claim],
      });
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Added by Alice')).toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: "Remove Bob's claim" })
      );
      expect(onRemoveClaim).toHaveBeenCalledWith(claim);
    });

    /**
     * Pins `profile-permissions` — "Master unclaim is disabled below the
     * floor". This list is the master-unclaim surface, and the floor is read
     * off the acting role rather than the item, so a manager meets the row
     * present and inert.
     */
    it('BelowTheOwnerFloor_RendersMasterUnclaimPresentAndDisabled', () => {
      renderContainer({
        actor: makeProfile('viewer', 'viewer', ROLES.manager),
        isOwner: true,
        claims: [OTHERS_CLAIM],
      });

      expect(
        screen.getByRole('button', { name: "Remove Bob's claim" })
      ).toBeDisabled();
    });

    it('AtTheOwnerFloor_RendersMasterUnclaimOperable', () => {
      renderContainer({
        actor: makeProfile('viewer', 'viewer', ROLES.owner),
        isOwner: true,
        claims: [OTHERS_CLAIM],
      });

      expect(
        screen.getByRole('button', { name: "Remove Bob's claim" })
      ).toBeEnabled();
    });
  });

  // Capacity is measured in units, so one purchaser can take some or all of
  // what is wanted. An entry asking for one is unchanged — no control at all.
  describe('UnitStepper', () => {
    const unitsField = () => screen.getByRole('spinbutton');

    it('EntryAskingForOne_RendersNoStepper', async () => {
      renderContainer({ capacity: { quantity: 1, remaining: 1 } });
      await screen.findByRole('button', { name: 'Claim this gift' });

      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('MultiUnitEntry_StepperCapsAtWhatRemains', async () => {
      renderContainer({ capacity: { quantity: 4, remaining: 3 } });
      await screen.findByRole('button', { name: 'Claim this gift' });

      expect(unitsField()).toHaveAttribute('max', '3');
      expect(unitsField()).toHaveValue(1);
    });

    it('ChosenUnits_CarriedByTheSelfClaim', async () => {
      const user = userEvent.setup();
      const { onSelfClaim } = renderContainer({
        capacity: { quantity: 4, remaining: 4 },
      });
      await screen.findByRole('button', { name: 'Claim this gift' });

      await user.clear(unitsField());
      await user.type(unitsField(), '3');
      await user.click(screen.getByRole('button', { name: 'Claim 3 of these' }));

      expect(onSelfClaim).toHaveBeenCalledWith(3);
    });

    it('UnitsTypedBeyondTheRemainder_ClampedToIt', async () => {
      const user = userEvent.setup();
      const { onSelfClaim } = renderContainer({
        capacity: { quantity: 9, remaining: 2 },
      });
      await screen.findByRole('button', { name: 'Claim this gift' });

      await user.clear(unitsField());
      await user.type(unitsField(), '9');
      await user.click(screen.getByRole('button', { name: 'Claim 2 of these' }));

      expect(onSelfClaim).toHaveBeenCalledWith(2);
    });

    it('EmptiedUnitsField_FallsBackToOneUnit', async () => {
      const user = userEvent.setup();
      const { onSelfClaim } = renderContainer({
        capacity: { quantity: 4, remaining: 4 },
      });
      await screen.findByRole('button', { name: 'Claim this gift' });

      await user.clear(unitsField());
      await user.click(screen.getByRole('button', { name: 'Claim this gift' }));

      expect(onSelfClaim).toHaveBeenCalledWith(1);
    });

    it('MultiUnitEntry_StepperSaysWhatIsAlreadyClaimed', async () => {
      renderContainer({ capacity: { quantity: 4, remaining: 3 } });
      await screen.findByRole('button', { name: 'Claim this gift' });

      expect(screen.getByText('1 of 4 claimed')).toBeInTheDocument();
    });

    it('MoreThanOneUnitChosen_TheClaimCtaStatesHowMany', async () => {
      const user = userEvent.setup();
      renderContainer({ capacity: { quantity: 4, remaining: 4 } });
      await screen.findByRole('button', { name: 'Claim this gift' });

      await user.click(screen.getByRole('button', { name: 'Increase' }));

      expect(
        screen.getByRole('button', { name: 'Claim 2 of these' })
      ).toBeInTheDocument();
    });

    // Below `claims` the page's payload withholds what is claimed, so its
    // remainder reads as the whole quantity. The control waits for the reveal
    // rather than offering a cap it would take back.
    it('BelowClaimsBeforeTheReveal_RendersNoStepper', () => {
      vi.mocked(claimSummaryForEntry).mockReturnValue(new Promise(() => {}));
      renderContainer({
        tier: 'surprise',
        capacity: { quantity: 4, remaining: 4 },
      });

      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('BelowClaimsAfterTheReveal_StepperCapsAtTheRevealedRemainder', async () => {
      vi.mocked(claimSummaryForEntry).mockResolvedValue({
        claimedUnits: 2,
        remaining: 2,
      });
      renderContainer({
        tier: 'surprise',
        capacity: { quantity: 4, remaining: 4 },
      });

      expect(await screen.findByRole('spinbutton')).toHaveAttribute('max', '2');
    });

    // A stepper offering one number is not a choice; the claim is the one unit
    // that is left, exactly as it is on an entry asking for one.
    it('OneUnitLeftOfMany_RendersNoStepper', async () => {
      renderContainer({ capacity: { quantity: 4, remaining: 1 } });
      await screen.findByRole('button', { name: 'Claim this gift' });

      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    });

    it('ChosenUnits_CarriedByAGuestClaim', async () => {
      const user = userEvent.setup();
      const { onGuestClaim } = renderContainer({
        actor: undefined,
        capacity: { quantity: 4, remaining: 4 },
      });

      await user.clear(unitsField());
      await user.type(unitsField(), '2');
      await user.type(screen.getByLabelText('Your name'), 'Grandma');
      await user.click(screen.getByRole('button', { name: 'Claim as Guest' }));

      expect(onGuestClaim).toHaveBeenCalledWith('Grandma', 2);
    });
  });
});
