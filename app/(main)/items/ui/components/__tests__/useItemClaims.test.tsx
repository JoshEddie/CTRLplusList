import { ROLES } from '@/lib/data/profile.roles';
import {
  createPurchase,
  removePurchase,
  revealedClaimsForEntry,
  setPurchaseUnits,
} from '@/lib/data/purchase.actions';
import type { PurchaseView, SpoilerTier } from '@/lib/types';
import { makeProfile } from '@/test/helpers/profile';
import { act, renderHook, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemClaims } from '../useItemClaims';
import { AMPLE_QUANTITY, LINKED_STORE, makeItem } from './test-helpers';

vi.mock('@/lib/data/purchase.actions', () => ({
  createPurchase: vi.fn(),
  removePurchase: vi.fn(),
  revealedClaimsForEntry: vi.fn(async () => []),
  setPurchaseUnits: vi.fn(),
}));

// Faithful on both shapes the hook uses it with: the function-form formatters
// are invoked with the settled value, and a rejection is rethrown so the hook's
// own catch decides what a refusal means.
vi.mock('react-hot-toast', () => ({
  default: {
    promise: <T,>(
      p: Promise<T>,
      opts: { success?: unknown; error?: unknown }
    ) =>
      p.then(
        (v) => {
          if (typeof opts?.success === 'function') opts.success(v);
          return v;
        },
        (e) => {
          if (typeof opts?.error === 'function') opts.error(e);
          throw e;
        }
      ),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const VIEWER = 'viewer';
const actorOf = (id: string) => makeProfile(id, id, ROLES.owner);

const ownClaim = (id = 'c1'): PurchaseView => ({
  id,
  by: 'self',
  name: 'You',
  claimedByViewer: true,
});
const othersClaim = (id = 'c2'): PurchaseView => ({
  id,
  by: 'other',
  name: 'Sam',
  claimedByViewer: false,
});
const assertedClaim = (id = 'c3'): PurchaseView => ({
  id,
  by: 'other',
  name: 'Sam',
  claimedByViewer: true,
});
const namelessClaim = (id = 'c4'): PurchaseView => ({
  id,
  by: 'other',
  claimedByViewer: false,
});

type Props = Parameters<typeof useItemClaims>[0];

function mount(overrides: Partial<Props> = {}) {
  const onSettled = vi.fn();
  const initialProps: Props = {
    item: makeItem(),
    isOwner: false,
    tier: 'claims' as SpoilerTier,
    revealNames: false,
    onSettled,
    ...overrides,
  };
  const view = renderHook((p: Props) => useItemClaims(p), { initialProps });
  return { ...view, onSettled, initialProps };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createPurchase).mockResolvedValue({
    success: true,
    id: 'server-id',
  } as never);
  vi.mocked(removePurchase).mockResolvedValue({ success: true } as never);
  vi.mocked(revealedClaimsForEntry).mockResolvedValue([]);
});

describe('Capacity', () => {
  it('QuantityOneWithOneClaimedUnit_IsFullyClaimed', () => {
    const { result } = mount({
      item: makeItem({ quantity: 1, purchases: [ownClaim()] }),
    });
    expect(result.current.isFullyClaimed).toBe(true);
  });

  it('QuantityTwoWithOneClaimedUnit_IsNotFullyClaimed', () => {
    const { result } = mount({
      item: makeItem({ quantity: 2, purchases: [ownClaim()] }),
    });
    expect(result.current.isFullyClaimed).toBe(false);
  });

  it('LargeQuantityWithTwoClaims_IsNotFullyClaimed', () => {
    const { result } = mount({
      item: makeItem({
        quantity: AMPLE_QUANTITY,
        purchases: [ownClaim(), othersClaim()],
      }),
    });
    expect(result.current.isFullyClaimed).toBe(false);
  });

  it('MoreClaimedUnitsThanQuantity_IsFullyClaimed', () => {
    const { result } = mount({
      item: makeItem({
        quantity: 1,
        purchases: [ownClaim(), othersClaim()],
      }),
    });
    expect(result.current.isFullyClaimed).toBe(true);
  });
});

describe('Counter', () => {
  it('QuantityTwoWithOneClaimedUnit_CounterReportsOneOverTwo', () => {
    const { result } = mount({
      item: makeItem({ quantity: 2, purchases: [ownClaim()] }),
    });
    expect(result.current.counterText).toBe('1/2 claimed');
  });

  // An entry that has met its quantity says so plainly: an owner who lowered
  // the number afterwards would otherwise be shown a fraction reading 3/2.
  it('ClaimedUnitsMeetingQuantity_CounterReadsFullyClaimed', () => {
    const { result } = mount({
      item: makeItem({ quantity: 2, claimed_units: 2 }),
    });
    expect(result.current.counterText).toBe('Fully claimed');
  });

  it('ClaimedUnitsPastQuantity_CounterReadsFullyClaimedWithNoFraction', () => {
    const { result } = mount({
      item: makeItem({ quantity: 2, claimed_units: 3 }),
    });
    expect(result.current.counterText).toBe('Fully claimed');
  });

  // The library reads no entry, so it has no capacity to count against and no
  // counter to offer. What the owner's banner shows there is the banner's own.
  it('NoEntry_CounterIsEmpty-EntryLineIsEmpty', () => {
    const { result } = mount({
      item: makeItem({
        list_id: undefined,
        quantity: undefined,
        purchases: [ownClaim(), othersClaim()],
      }),
    });
    expect(result.current.counterText).toBe('');
    expect(result.current.entryLine).toBe('');
  });

  it('QuantityTwo_EntryLineReadsClaimProgress', () => {
    const { result } = mount({ item: makeItem({ quantity: 2 }) });
    expect(result.current.entryLine).toBe('0/2 claimed');
  });

  // A single-quantity item has nothing to count towards, so an ordinary list
  // reads exactly as it did before entries carried a number.
  it('QuantityOne_EntryLineIsEmpty', () => {
    const { result } = mount({ item: makeItem({ quantity: 1 }) });
    expect(result.current.entryLine).toBe('');
  });

  // Below `claims` the projection withheld other parties' claims, so a counter
  // built from the payload would state a false zero rather than hide. The
  // owner's ask is not claim data, so it survives the withholding.
  it('TierBelowClaims_EntryLineReadsTheBareAsk', () => {
    const { result } = mount({
      item: makeItem({ quantity: 2 }),
      tier: 'progress',
    });
    expect(result.current.entryLine).toBe('2 wanted');
  });

  // The owner's claim count is spoiler-gated onto their banner; the row states
  // what they asked for, which is theirs to know at every tier.
  it('Owner_EntryLineReadsTheBareAsk', () => {
    const { result } = mount({
      item: makeItem({ quantity: 4, claimed_units: 2 }),
      isOwner: true,
    });
    expect(result.current.entryLine).toBe('4 wanted');
  });

  // The sold-out row already carries its claimed-by banner.
  it('FullyClaimedViewer_EntryLineIsEmpty', () => {
    const { result } = mount({
      item: makeItem({ quantity: 2, claimed_units: 2 }),
    });
    expect(result.current.entryLine).toBe('');
  });
});

describe('ViewerClaims', () => {
  it('MixedClaims_KeepsOnlyTheViewersOwnAndAssertedOnes', () => {
    const { result } = mount({
      item: makeItem({
        quantity: AMPLE_QUANTITY,
        purchases: [ownClaim(), othersClaim(), assertedClaim()],
      }),
    });
    expect(result.current.viewerClaims.map((c) => c.id)).toEqual(['c1', 'c3']);
  });

  it('NoViewerClaims_HasViewerClaimIsFalse', () => {
    const { result } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [othersClaim()] }),
    });
    expect(result.current.hasViewerClaim).toBe(false);
  });

  it('OwnClaim_ViewerIsThePurchaser', () => {
    const { result } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [ownClaim()] }),
    });
    expect(result.current.viewerIsPurchaser).toBe(true);
  });

  // An asserted claim is removable by the viewer but bought by someone else.
  it('AssertedClaimOnly_ViewerIsNotThePurchaser', () => {
    const { result } = mount({
      item: makeItem({
        quantity: AMPLE_QUANTITY,
        purchases: [assertedClaim()],
      }),
    });
    expect(result.current.viewerIsPurchaser).toBe(false);
  });
});

describe('SpoilerGates', () => {
  it('TierBelowClaims_WithholdsTheCount', () => {
    const { result } = mount({ tier: 'surprise' });
    expect(result.current.countWithheld).toBe(true);
  });

  it('TierAtClaims_DoesNotWithholdTheCount', () => {
    const { result } = mount({ tier: 'claims' });
    expect(result.current.countWithheld).toBe(false);
  });

  it('OwnerWithANamelessClaim_WithholdsNames', () => {
    const { result } = mount({
      isOwner: true,
      item: makeItem({
        quantity: AMPLE_QUANTITY,
        purchases: [namelessClaim()],
      }),
    });
    expect(result.current.namesWithheld).toBe(true);
  });

  it('OwnerWithEveryClaimNamed_DoesNotWithholdNames', () => {
    const { result } = mount({
      isOwner: true,
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [othersClaim()] }),
    });
    expect(result.current.namesWithheld).toBe(false);
  });

  // Naming is the owner's reveal alone; nobody else is offered it, so there is
  // nothing to withhold from them.
  it('NonOwnerWithANamelessClaim_DoesNotWithholdNames', () => {
    const { result } = mount({
      item: makeItem({
        quantity: AMPLE_QUANTITY,
        purchases: [namelessClaim()],
      }),
    });
    expect(result.current.namesWithheld).toBe(false);
  });

  it('OwnerBelowClaimsTier_WithholdsNames', () => {
    const { result } = mount({ isOwner: true, tier: 'surprise' });
    expect(result.current.namesWithheld).toBe(true);
  });

  it('OwnerWithClaimsAtClaimsTier_ShowsTheSpoilerPill', () => {
    const { result } = mount({
      isOwner: true,
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [othersClaim()] }),
    });
    expect(result.current.showSpoilerInfo).toBe(true);
  });

  it('OwnerWithNoClaims_HidesTheSpoilerPill', () => {
    const { result } = mount({ isOwner: true });
    expect(result.current.showSpoilerInfo).toBe(false);
  });
});

describe('PurchasedTreatment', () => {
  it('NonOwnerFullyClaimed_ShowsThePurchasedTreatment', () => {
    const { result } = mount({
      item: makeItem({ quantity: 1, purchases: [othersClaim()] }),
    });
    expect(result.current.showPurchased).toBe(true);
  });

  // The owner's own list never goes sold-out on them.
  it('OwnerFullyClaimed_HidesThePurchasedTreatment', () => {
    const { result } = mount({
      isOwner: true,
      item: makeItem({ quantity: 1, purchases: [othersClaim()] }),
    });
    expect(result.current.showPurchased).toBe(false);
  });
});

describe('BuyClaimAffordance', () => {
  const buyable = {
    item: makeItem({ store: LINKED_STORE, quantity: 1 }),
    actor: actorOf(VIEWER),
  };

  it('AuthedNonOwnerUnclaimedWithACompleteStore_OffersBuyClaim', () => {
    const { result } = mount(buyable);
    expect(result.current.showBuyClaim).toBe(true);
  });

  it('SignedOutViewer_WithholdsBuyClaim', () => {
    const { result } = mount({ ...buyable, actor: undefined });
    expect(result.current.showBuyClaim).toBe(false);
  });

  it('Owner_WithholdsBuyClaim', () => {
    const { result } = mount({ ...buyable, isOwner: true });
    expect(result.current.showBuyClaim).toBe(false);
  });

  it('FullyClaimed_WithholdsBuyClaim', () => {
    const { result } = mount({
      ...buyable,
      item: makeItem({
        store: LINKED_STORE,
        quantity: 1,
        purchases: [othersClaim()],
      }),
    });
    expect(result.current.showBuyClaim).toBe(false);
  });

  it('ViewerAlreadyHoldsAClaim_WithholdsBuyClaim', () => {
    const { result } = mount({
      ...buyable,
      item: makeItem({
        store: LINKED_STORE,
        quantity: AMPLE_QUANTITY,
        purchases: [ownClaim()],
      }),
    });
    expect(result.current.showBuyClaim).toBe(false);
  });

  // Nowhere to send the buyer without a complete store.
  it('NoCompleteStore_WithholdsBuyClaim', () => {
    const { result } = mount({ ...buyable, item: makeItem({ store: null }) });
    expect(result.current.showBuyClaim).toBe(false);
  });
});

describe('ProjectionSync', () => {
  it('ProjectionChanges_ReplacesTheLocalClaims', () => {
    const { result, rerender, initialProps } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [ownClaim()] }),
    });
    rerender({
      ...initialProps,
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [othersClaim()] }),
    });
    expect(result.current.claims.map((c) => c.id)).toEqual(['c2']);
  });

  // The projection arrives as a fresh array every render; only a change in what
  // it says may discard a claim the viewer just made.
  it('EquivalentProjectionRerendered_KeepsAnOptimisticallyAddedClaim', async () => {
    const { result, rerender, initialProps } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [] }),
    });
    await act(async () => {
      await result.current.handleSelfClaim();
    });
    rerender({
      ...initialProps,
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [] }),
    });
    expect(result.current.claims.map((c) => c.id)).toEqual(['server-id']);
  });
});

describe('NoEntry', () => {
  // No entry, no claim: the affordance is withheld without one, and the write
  // path refuses even when a handler is called directly.
  const noEntry = () =>
    mount({
      item: makeItem({ list_id: undefined, quantity: undefined }),
      actor: actorOf(VIEWER),
    });

  it('SelfClaim_SendsNoClaimAndAddsNothing', async () => {
    const { result } = noEntry();
    await act(async () => {
      await result.current.handleSelfClaim();
    });
    expect(createPurchase).not.toHaveBeenCalled();
    expect(result.current.claims).toEqual([]);
  });

  it('Render_IsNotClaimable-OffersNoBuyClaim', () => {
    const { result } = mount({
      item: makeItem({
        list_id: undefined,
        quantity: undefined,
        store: LINKED_STORE,
      }),
      actor: actorOf(VIEWER),
    });
    expect(result.current.claimable).toBe(false);
    expect(result.current.showBuyClaim).toBe(false);
  });
});

describe('RecordClaim', () => {
  it('SelfClaim_AppendsTheClaimUnderTheServerIssuedId', async () => {
    const { result } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY }),
      userName: 'Vicky',
    });
    await act(async () => {
      await result.current.handleSelfClaim();
    });
    expect(result.current.claims).toEqual([
      expect.objectContaining({
        id: 'server-id',
        by: 'self',
        name: 'Vicky',
        claimedByViewer: true,
      }),
    ]);
  });

  it('SelfClaimWithoutAUserName_NamesTheClaimYou', async () => {
    const { result } = mount({ item: makeItem({ quantity: AMPLE_QUANTITY }) });
    await act(async () => {
      await result.current.handleSelfClaim();
    });
    expect(result.current.claims[0].name).toBe('You');
  });

  it('SelfClaim_SettlesTheModal', async () => {
    const { result, onSettled } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY }),
    });
    await act(async () => {
      await result.current.handleSelfClaim();
    });
    expect(onSettled).toHaveBeenCalledWith(true, expect.anything());
  });

  it('AttributedClaim_SendsThePurchasedByTarget', async () => {
    const { result } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY }),
      actor: actorOf(VIEWER),
    });
    await act(async () => {
      await result.current.handleAttributedClaim({ id: 'sam', name: 'Sam' });
    });
    expect(createPurchase).toHaveBeenCalledWith({
      item_id: 'i1',
      list_id: 'l1',
      guest_name: null,
      purchased_by: 'sam',
      units: 1,
    });
    expect(result.current.claims[0]).toEqual(
      expect.objectContaining({ by: 'other', name: 'Sam' })
    );
  });

  // Attributing to yourself is a self-claim however the picker got there.
  it('AttributedClaimTargetingTheActor_RecordsItAsASelfClaim', async () => {
    const { result } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY }),
      actor: actorOf(VIEWER),
    });
    await act(async () => {
      await result.current.handleAttributedClaim({
        id: VIEWER,
        name: 'Vicky',
      });
    });
    expect(result.current.claims[0].by).toBe('self');
  });

  // The action writes the guest cookie, which makes this the viewer's own claim
  // — matching how the server overlay marks it on the next read.
  it('SignedOutGuestClaim_MarksTheClaimAsTheViewersOwn', async () => {
    const { result } = mount({ item: makeItem({ quantity: AMPLE_QUANTITY }) });
    await act(async () => {
      await result.current.handleGuestClaim('Josh');
    });
    expect(result.current.claims[0]).toEqual(
      expect.objectContaining({ by: 'self', name: 'Josh' })
    );
  });

  it('AuthedGuestClaim_MarksTheClaimAsSomeoneElses', async () => {
    const { result } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY }),
      actor: actorOf(VIEWER),
    });
    await act(async () => {
      await result.current.handleGuestClaim('Josh');
    });
    expect(result.current.claims[0].by).toBe('other');
  });

  it('RefusedClaim_LeavesTheClaimsUnchangedAndReportsTheReason', async () => {
    vi.mocked(createPurchase).mockResolvedValue({
      success: false,
      message: 'Already claimed',
    } as never);
    const { result } = mount({ item: makeItem({ quantity: AMPLE_QUANTITY }) });
    await act(async () => {
      await result.current.handleSelfClaim();
    });
    expect(result.current.claims).toEqual([]);
    expect(toast.error).toHaveBeenCalledWith('Already claimed');
  });
});

describe('RemoveClaim', () => {
  const claimed = () =>
    makeItem({
      quantity: AMPLE_QUANTITY,
      purchases: [ownClaim(), othersClaim()],
    });

  it('Remove_DropsTheClaimAndReportsSuccess', async () => {
    const { result } = mount({ item: claimed() });
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.removeClaim(ownClaim());
    });
    expect(outcome).toBe(true);
    expect(result.current.claims.map((c) => c.id)).toEqual(['c2']);
  });

  // A refusal resolves rather than throwing, so it must be routed to failure
  // explicitly or it would be reported as a removal that never happened.
  it('RefusedRemoval_KeepsTheClaimAndReportsFailure', async () => {
    vi.mocked(removePurchase).mockResolvedValue({
      success: false,
      message: 'Not your claim',
    } as never);
    const { result } = mount({ item: claimed() });
    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.removeClaim(ownClaim());
    });
    expect(outcome).toBe(false);
    expect(result.current.claims.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('ManageRemoveOfTheViewersLastClaim_SettlesTheModal', async () => {
    const { result, onSettled } = mount({ item: claimed() });
    await act(async () => {
      await result.current.handleManageRemove(ownClaim());
    });
    expect(onSettled).toHaveBeenCalled();
  });

  it('ManageRemoveLeavingAnotherViewerClaim_LeavesTheModalOpen', async () => {
    const { result, onSettled } = mount({
      item: makeItem({
        quantity: AMPLE_QUANTITY,
        purchases: [ownClaim(), assertedClaim()],
      }),
    });
    await act(async () => {
      await result.current.handleManageRemove(ownClaim());
    });
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('ManageRemoveRefused_LeavesTheModalOpen', async () => {
    vi.mocked(removePurchase).mockResolvedValue({ success: false } as never);
    const { result, onSettled } = mount({ item: claimed() });
    await act(async () => {
      await result.current.handleManageRemove(ownClaim());
    });
    expect(onSettled).not.toHaveBeenCalled();
  });
});

describe('BuyClaimUndo', () => {
  it('BuyClaim_ParksTheRecordedClaimForUndo', async () => {
    const { result } = mount({ item: makeItem({ quantity: AMPLE_QUANTITY }) });
    await act(async () => {
      await result.current.handleBuyClaim();
    });
    expect(result.current.undoClaim).toEqual(
      expect.objectContaining({ id: 'server-id' })
    );
  });

  it('RefusedBuyClaim_ParksNothing', async () => {
    vi.mocked(createPurchase).mockResolvedValue({ success: false } as never);
    const { result } = mount({ item: makeItem({ quantity: AMPLE_QUANTITY }) });
    await act(async () => {
      await result.current.handleBuyClaim();
    });
    expect(result.current.undoClaim).toBeNull();
  });

  it('DismissUndo_ClearsTheParkedClaim', async () => {
    const { result } = mount({ item: makeItem({ quantity: AMPLE_QUANTITY }) });
    await act(async () => {
      await result.current.handleBuyClaim();
    });
    act(() => result.current.dismissUndo());
    expect(result.current.undoClaim).toBeNull();
  });

  // Buy & Claim does not open the modal, so settling must not close anything.
  it('BuyClaim_DoesNotSettleTheModal', async () => {
    const { result, onSettled } = mount({
      item: makeItem({ quantity: AMPLE_QUANTITY }),
    });
    await act(async () => {
      await result.current.handleBuyClaim();
    });
    expect(onSettled).not.toHaveBeenCalled();
  });
});

describe('NameReveal', () => {
  const withheld = () =>
    makeItem({ quantity: AMPLE_QUANTITY, purchases: [namelessClaim()] });

  it('OwnerRevealingNamelessStubs_LoadsTheNamedClaims', async () => {
    vi.mocked(revealedClaimsForEntry).mockResolvedValue([othersClaim()]);
    const { result } = mount({
      isOwner: true,
      item: withheld(),
      revealNames: true,
    });
    await waitFor(() =>
      expect(result.current.revealedClaims).toEqual([othersClaim()])
    );
  });

  // The claim route promises a count and no names, so it reads the payload
  // however nameless it arrives rather than asking the server for more.
  it('RevealNotRequested_NeverFetchesTheNames', async () => {
    const { result } = mount({
      isOwner: true,
      item: withheld(),
      revealNames: false,
    });
    await waitFor(() => expect(result.current.claims).toHaveLength(1));
    expect(revealedClaimsForEntry).not.toHaveBeenCalled();
    expect(result.current.revealedClaims).toBeNull();
  });

  it('OwnerWithEveryClaimAlreadyNamed_NeverFetchesTheNames', async () => {
    const { result } = mount({
      isOwner: true,
      item: makeItem({ quantity: AMPLE_QUANTITY, purchases: [othersClaim()] }),
      revealNames: true,
    });
    await waitFor(() => expect(result.current.claims).toHaveLength(1));
    expect(revealedClaimsForEntry).not.toHaveBeenCalled();
  });

  it('RemovalAfterAReveal_DropsTheRowFromTheRevealedClaimsToo', async () => {
    vi.mocked(revealedClaimsForEntry).mockResolvedValue([
      othersClaim(),
      assertedClaim(),
    ]);
    const { result } = mount({
      isOwner: true,
      item: withheld(),
      revealNames: true,
    });
    await waitFor(() => expect(result.current.revealedClaims).toHaveLength(2));
    await act(async () => {
      await result.current.removeClaim(othersClaim());
    });
    expect(result.current.revealedClaims?.map((c) => c.id)).toEqual(['c3']);
  });
});

// Capacity is measured in units, so what a claim covers is a number the hook
// both sends and keeps.
describe('ClaimUnits', () => {
  beforeEach(() => {
    vi.mocked(setPurchaseUnits).mockResolvedValue({
      success: true,
      message: 'ok',
    });
  });

  it('MultiUnitSelfClaim_SendsTheUnitsAndHoldsThemOptimistically', async () => {
    vi.mocked(createPurchase).mockResolvedValue({
      success: true,
      message: 'ok',
      id: 'srv-1',
    });
    const { result } = mount({
      item: makeItem({ quantity: 4 }),
      actor: actorOf(VIEWER),
    });

    await act(async () => {
      await result.current.handleSelfClaim(3);
    });

    expect(createPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ units: 3 })
    );
    expect(result.current.claims[0]).toEqual(
      expect.objectContaining({ id: 'srv-1', units: 3 })
    );
  });

  // The counter follows units rather than rows: three units on one claim leave
  // one of four, not three.
  it('ThreeUnitsOnOneClaim_LeaveOneOfFourRemaining', () => {
    const { result } = mount({
      item: makeItem({
        quantity: 4,
        claimed_units: 3,
        purchases: [ownClaim()],
      }),
    });

    expect(result.current.capacity).toEqual({ quantity: 4, remaining: 1 });
    expect(result.current.isFullyClaimed).toBe(false);
  });

  it('OnePurchaserHoldingEveryUnit_LeavesTheEntryFullyClaimed', () => {
    const { result } = mount({
      item: makeItem({
        quantity: 4,
        claimed_units: 4,
        purchases: [othersClaim()],
      }),
    });

    expect(result.current.capacity).toEqual({ quantity: 4, remaining: 0 });
    expect(result.current.isFullyClaimed).toBe(true);
  });

  it('UnitsRaised_PersistsAndMovesTheRemainder', async () => {
    const { result } = mount({
      item: makeItem({
        quantity: 4,
        claimed_units: 1,
        purchases: [{ ...ownClaim(), units: 1 }],
      }),
    });

    await act(async () => {
      await result.current.updateClaimUnits(result.current.claims[0], 3);
    });

    expect(setPurchaseUnits).toHaveBeenCalledWith({
      purchase_id: 'c1',
      units: 3,
    });
    expect(result.current.claims[0].units).toBe(3);
    expect(result.current.capacity?.remaining).toBe(1);
  });

  // Zero units is unclaiming, so the row goes rather than showing a claim for
  // nothing.
  it('UnitsDroppedToZero_RemovesTheClaimLocally', async () => {
    const { result } = mount({
      item: makeItem({
        quantity: 4,
        claimed_units: 2,
        purchases: [{ ...ownClaim(), units: 2 }],
      }),
    });

    await act(async () => {
      await result.current.updateClaimUnits(result.current.claims[0], 0);
    });

    expect(result.current.claims).toEqual([]);
    expect(result.current.capacity?.remaining).toBe(4);
  });

  it('RefusedUnitEdit_LeavesTheClaimUntouched', async () => {
    vi.mocked(setPurchaseUnits).mockResolvedValue({
      success: false,
      message: 'This item is fully claimed',
      error: 'Fully claimed',
    });
    const { result } = mount({
      item: makeItem({
        quantity: 4,
        claimed_units: 2,
        purchases: [{ ...ownClaim(), units: 2 }],
      }),
    });

    const moved = await act(async () =>
      result.current.updateClaimUnits(result.current.claims[0], 4)
    );

    expect(moved).toBe(false);
    expect(result.current.claims[0].units).toBe(2);
  });
});
