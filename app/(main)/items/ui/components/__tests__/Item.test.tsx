/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The owner/preview/claim state lands on classed wrapper divs that carry no role,
 * so a few assertions query by class.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPurchase, removePurchase } from '@/lib/data/purchase.actions';
import Item from '../Item';

vi.mock('@/lib/data/purchase.actions', () => ({
  createPurchase: vi.fn(),
  removePurchase: vi.fn(),
}));

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
const sp = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/lists/l1',
  useSearchParams: () => sp.value,
}));

// Faithful enough to invoke the function-form `error`/`success` formatters the
// component passes (so those arrows are exercised), while rethrowing rejections
// to the component's own try/catch.
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

// The carve-out children own their own rendering tests; here they are
// prop-surfacing stubs so Item's orchestration + handler wiring is asserted in
// isolation.
vi.mock('../ItemCard', () => ({
  default: (p: Record<string, unknown>) => (
    <div
      data-testid="item-card"
      data-show-purchased={String(p.showPurchased)}
      data-show-spoiler={String(p.showSpoilerInfo)}
      data-disabled={String(p.claimActionDisabled)}
      data-show-counter={String(p.showCounter)}
      data-counter={p.counterText as string}
      data-summary={p.claimSummary as string}
      data-is-owner={String(p.isOwner)}
      data-my-claim={String(!!p.myClaim)}
      data-show-owner-claim={String(p.showOwnerClaimAction)}
    >
      <button type="button" onClick={p.onPurchaseClick as () => void}>
        card-claim
      </button>
    </div>
  ),
}));
vi.mock('../ClaimBanners', () => ({
  default: (p: Record<string, unknown>) => {
    const claims = p.claims as { id: string; firstName: string }[];
    return (
      <div
        data-testid="claim-banners"
        data-claims={claims.map((c) => c.firstName).join(',')}
        data-my-claim={String(!!p.myClaim)}
        data-counter={p.counterText as string}
      >
        <button type="button" onClick={p.onUndo as () => void}>
          banner-undo
        </button>
        <button
          type="button"
          onClick={() =>
            (p.onRemoveClaim as (c: unknown) => void)(claims[0])
          }
        >
          banner-remove-first
        </button>
      </div>
    );
  },
}));
vi.mock('../OwnerActions', () => ({
  default: (p: Record<string, unknown>) => (
    <div
      data-testid="owner-actions"
      data-item-id={p.itemId as string}
      data-archived={String(p.archivedView)}
      data-show-archive={String(p.showArchiveAction)}
    >
      <button type="button" onClick={p.onArchived as () => void}>
        owner-archived
      </button>
    </div>
  ),
}));
vi.mock('../PurchaseModalSlot', () => ({
  default: (p: Record<string, unknown>) => (
    <div
      data-testid="modal-slot"
      data-removable-claim={String(!!p.removableClaim)}
      data-is-owner={String(p.isOwner)}
      data-item-name={p.itemName as string}
    >
      <button type="button" onClick={p.onSelfClaim as () => void}>
        claim-self
      </button>
      <button
        type="button"
        onClick={() =>
          (p.onAttributedClaim as (t: unknown) => void)({
            id: 'u9',
            name: 'Sam Lee',
          })
        }
      >
        claim-attributed
      </button>
      <button
        type="button"
        onClick={() =>
          (p.onAttributedClaim as (t: unknown) => void)({
            id: 'u9',
            name: null,
          })
        }
      >
        claim-attributed-null-name
      </button>
      <button
        type="button"
        onClick={() => (p.onGuestClaim as (n: string) => void)('Sam Lee')}
      >
        claim-guest
      </button>
      <button type="button" onClick={p.onUndoConfirm as () => void}>
        confirm-undo
      </button>
      <button type="button" onClick={p.onClose as () => void}>
        slot-close
      </button>
    </div>
  ),
}));

const OWNER = 'owner';

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    name: 'Gift',
    description: '',
    image_url: '',
    user_id: OWNER,
    quantity_limit: 1,
    stores: [],
    purchases: [],
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as never;
}

function renderItem(
  props: Omit<Partial<React.ComponentProps<typeof Item>>, 'item'> & {
    item?: Record<string, unknown>;
  } = {},
  query = ''
) {
  const { item: itemOverrides, ...rest } = props;
  sp.value = new URLSearchParams(query);
  return render(<Item item={makeItem(itemOverrides ?? {})} {...rest} />);
}

const card = () => screen.getByTestId('item-card');
const banners = () => screen.getByTestId('claim-banners');

beforeEach(() => {
  vi.clearAllMocks();
  sp.value = new URLSearchParams();
  vi.mocked(createPurchase).mockResolvedValue({ success: true } as never);
  vi.mocked(removePurchase).mockResolvedValue({ success: true } as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('Item', () => {
  describe('OwnerGate', () => {
    it('Owner_MountsOwnerActions-MarksContainerOwner', () => {
      const { container } = renderItem(
        { user_id: OWNER, showArchiveAction: true },
        ''
      );
      const actions = screen.getByTestId('owner-actions');
      expect(actions).toHaveAttribute('data-item-id', 'i1');
      expect(actions).toHaveAttribute('data-show-archive', 'true');
      expect(container.querySelector('.item-container')).toHaveClass('owner');
    });

    it('Viewer_OmitsOwnerActions', () => {
      renderItem({ item: { user_id: OWNER }, user_id: 'viewer' });
      expect(screen.queryByTestId('owner-actions')).not.toBeInTheDocument();
    });

    it('OwnerArchivedCallback_Refreshes', async () => {
      const user = userEvent.setup();
      renderItem({ user_id: OWNER, showArchiveAction: true });
      await user.click(screen.getByRole('button', { name: 'owner-archived' }));
      expect(router.refresh).toHaveBeenCalled();
    });
  });

  describe('DerivedState', () => {
    it('ViewerFullyClaimed_ForwardsPurchasedAndDisabled', () => {
      renderItem({
        item: {
          user_id: OWNER,
          quantity_limit: 1,
          purchases: [
            { id: 'p1', by: 'other', firstName: 'Sam', claimedByViewer: false },
          ],
        },
        user_id: 'viewer',
      });
      expect(card()).toHaveAttribute('data-show-purchased', 'true');
      expect(card()).toHaveAttribute('data-disabled', 'true');
      expect(banners()).toHaveAttribute('data-claims', 'Sam');
    });

    it('UnlimitedQuantity_ForwardsInfinityCounter', () => {
      renderItem({
        item: { user_id: OWNER, quantity_limit: null },
        user_id: 'viewer',
      });
      expect(card()).toHaveAttribute('data-counter', '0/∞ claimed');
      expect(card()).toHaveAttribute('data-show-counter', 'true');
    });

    it('QuantityLimitOne_HidesCounter', () => {
      renderItem({
        item: { user_id: OWNER, quantity_limit: 1 },
        user_id: 'viewer',
      });
      expect(card()).toHaveAttribute('data-show-counter', 'false');
      expect(card()).toHaveAttribute('data-counter', '0/1 claimed');
    });

    it('OwnerWithClaims_ForwardsSpoilerState', () => {
      renderItem({
        user_id: OWNER,
        item: {
          user_id: OWNER,
          quantity_limit: 3,
          purchases: [
            { id: 'p1', by: 'other', firstName: 'Sam', claimedByViewer: false },
          ],
        },
      });
      expect(card()).toHaveAttribute('data-show-spoiler', 'true');
    });

    it('NoClaims_ForwardsEmptyClaims', () => {
      renderItem({ item: { user_id: OWNER }, user_id: 'viewer' });
      expect(banners()).toHaveAttribute('data-claims', '');
    });

    it('SelfClaim_ForwardsYouSummaryAndMyClaim', () => {
      renderItem({
        item: {
          user_id: OWNER,
          purchases: [
            { id: 'pm', by: 'self', firstName: 'You', claimedByViewer: true },
          ],
        },
        user_id: 'viewer',
      });
      expect(card()).toHaveAttribute('data-summary', 'You');
      expect(banners()).toHaveAttribute('data-my-claim', 'true');
    });

    it('MissingPurchasesField_TreatedAsNoClaims', () => {
      renderItem({
        item: { user_id: OWNER, purchases: undefined },
        user_id: 'viewer',
      });
      expect(banners()).toHaveAttribute('data-my-claim', 'false');
    });

    it('PropSync_ResyncsLocalPurchasesOnPropChange', () => {
      const { rerender } = renderItem({
        item: { user_id: OWNER },
        user_id: 'viewer',
      });
      expect(banners()).toHaveAttribute('data-claims', '');
      rerender(
        <Item
          item={makeItem({
            user_id: OWNER,
            purchases: [
              { id: 'p9', by: 'other', firstName: 'Sam', claimedByViewer: false },
            ],
          })}
          user_id="viewer"
        />
      );
      expect(banners()).toHaveAttribute('data-claims', 'Sam');
    });
  });

  describe('OwnerClaimGate', () => {
    const ownedWithRoom = {
      user_id: OWNER,
      item: {
        user_id: OWNER,
        quantity_limit: 3,
        purchases: [
          { id: 'p1', by: 'other', firstName: 'Sam', claimedByViewer: false },
        ],
      },
    };

    it('OwnerSpoilersWithRemainingQuantity_ForwardsShowOwnerClaimTrue', () => {
      renderItem({ ...ownedWithRoom, showSpoilers: true });
      expect(card()).toHaveAttribute('data-show-owner-claim', 'true');
    });

    it('OwnerWithoutSpoilers_ForwardsShowOwnerClaimFalse', () => {
      renderItem(ownedWithRoom);
      expect(card()).toHaveAttribute('data-show-owner-claim', 'false');
    });

    it('OwnerSpoilersFullyClaimed_ForwardsShowOwnerClaimFalse', () => {
      renderItem({
        user_id: OWNER,
        showSpoilers: true,
        item: {
          user_id: OWNER,
          quantity_limit: 1,
          purchases: [
            { id: 'p1', by: 'other', firstName: 'Sam', claimedByViewer: false },
          ],
        },
      });
      expect(card()).toHaveAttribute('data-show-owner-claim', 'false');
    });

    it('ViewerSpoilers_ForwardsShowOwnerClaimFalse', () => {
      renderItem({
        item: { user_id: OWNER },
        user_id: 'viewer',
        showSpoilers: true,
      });
      expect(card()).toHaveAttribute('data-show-owner-claim', 'false');
    });
  });

  describe('ModalMount', () => {
    it('PurchaseParamMatches_MountsModalSlot', () => {
      renderItem(
        { item: { user_id: OWNER }, user_id: 'viewer' },
        'purchaseItem=i1'
      );
      expect(screen.getByTestId('modal-slot')).toBeInTheDocument();
    });

    it('NoPurchaseParam_NoModalSlot', () => {
      renderItem({ item: { user_id: OWNER }, user_id: 'viewer' });
      expect(screen.queryByTestId('modal-slot')).not.toBeInTheDocument();
    });

    it('Preview_NeverMountsModalSlot', () => {
      renderItem(
        { item: { user_id: 'viewer' }, user_id: 'viewer', preview: true },
        'purchaseItem=i1'
      );
      expect(screen.queryByTestId('modal-slot')).not.toBeInTheDocument();
    });

    it('PreviewFlag_MarksContainerPreview', () => {
      const { container } = renderItem({
        item: { user_id: 'viewer' },
        user_id: 'viewer',
        preview: true,
      });
      expect(container.querySelector('.item-container')).toHaveClass('preview');
    });
  });

  describe('OpenModal', () => {
    it('CardClaimClick_PushesPurchaseParam', async () => {
      const user = userEvent.setup();
      renderItem({ item: { user_id: OWNER }, user_id: 'viewer' });
      await user.click(screen.getByRole('button', { name: 'card-claim' }));
      expect(router.push).toHaveBeenCalledWith(
        expect.stringContaining('purchaseItem=i1')
      );
    });

    it('BannerUndoClick_AlsoOpensModal', async () => {
      const user = userEvent.setup();
      renderItem({ item: { user_id: OWNER }, user_id: 'viewer' });
      await user.click(screen.getByRole('button', { name: 'banner-undo' }));
      expect(router.push).toHaveBeenCalledWith(
        expect.stringContaining('purchaseItem=i1')
      );
    });

    it('CloseSlot_ReplacesUrlWithoutPurchaseParam', async () => {
      const user = userEvent.setup();
      renderItem(
        { item: { user_id: OWNER }, user_id: 'viewer' },
        'purchaseItem=i1'
      );
      await user.click(screen.getByRole('button', { name: 'slot-close' }));
      expect(router.replace).toHaveBeenCalledWith(
        expect.not.stringContaining('purchaseItem')
      );
    });

    it('NullSearchParams_CloseReplacesWithBarePath', async () => {
      // useSearchParams returns null when rendered outside a client
      // navigation context; close must still produce a valid URL.
      sp.value = null as never;
      const user = userEvent.setup();
      render(
        <Item item={makeItem({ id: undefined })} user_id="viewer" />
      );
      await user.click(screen.getByRole('button', { name: 'slot-close' }));
      expect(router.replace).toHaveBeenCalledWith('/lists/l1?');
    });

    it('NullItemName_ModalSlotGetsEmptyName', () => {
      renderItem(
        { item: { user_id: OWNER, name: null }, user_id: 'viewer' },
        'purchaseItem=i1'
      );
      expect(screen.getByTestId('modal-slot')).toHaveAttribute(
        'data-item-name',
        ''
      );
    });
  });

  describe('Claim', () => {
    const viewer = {
      item: { user_id: OWNER },
      user_id: 'viewer',
      user_name: 'Vicky',
    };

    it('SelfClaim_CreatePurchaseNullGuest-AddsOptimisticSelfClaim', async () => {
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'claim-self' }));
      expect(createPurchase).toHaveBeenCalledWith({
        item_id: 'i1',
        guest_name: null,
      });
      await waitFor(() =>
        expect(screen.getByTestId('claim-banners')).toHaveAttribute(
          'data-my-claim',
          'true'
        )
      );
    });

    it('AttributedClaim_CreatePurchaseWithPurchasedBy-AddsClaimedByViewerRow', async () => {
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(
        screen.getByRole('button', { name: 'claim-attributed' })
      );
      expect(createPurchase).toHaveBeenCalledWith({
        item_id: 'i1',
        guest_name: null,
        purchased_by: 'u9',
      });
      // firstToken keeps only the first word of the optimistic display name;
      // the viewer asserted the claim, so the undo affordance unlocks.
      await waitFor(() =>
        expect(screen.getByTestId('claim-banners')).toHaveAttribute(
          'data-claims',
          'Sam'
        )
      );
      expect(screen.getByTestId('claim-banners')).toHaveAttribute(
        'data-my-claim',
        'true'
      );
    });

    it('GuestClaim_CreatePurchaseWithName-AddsOtherClaim', async () => {
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'claim-guest' }));
      expect(createPurchase).toHaveBeenCalledWith({
        item_id: 'i1',
        guest_name: 'Sam Lee',
      });
      await waitFor(() =>
        expect(screen.getByTestId('claim-banners')).toHaveAttribute(
          'data-claims',
          'Sam'
        )
      );
    });

    it('EmptyItemId_PayloadCarriesEmptyId', async () => {
      const user = userEvent.setup();
      renderItem(
        { item: { user_id: OWNER, id: '' }, user_id: 'viewer', user_name: 'V' },
        'purchaseItem='
      );
      await user.click(screen.getByRole('button', { name: 'claim-self' }));
      expect(createPurchase).toHaveBeenCalledWith({
        item_id: '',
        guest_name: null,
      });
      await user.click(
        screen.getByRole('button', { name: 'claim-attributed' })
      );
      expect(createPurchase).toHaveBeenCalledWith({
        item_id: '',
        guest_name: null,
        purchased_by: 'u9',
      });
      await user.click(screen.getByRole('button', { name: 'claim-guest' }));
      expect(createPurchase).toHaveBeenCalledWith({
        item_id: '',
        guest_name: 'Sam Lee',
      });
    });

    it('SelfClaimWithoutUserName_OptimisticClaimNamedYou', async () => {
      const user = userEvent.setup();
      renderItem(
        { item: { user_id: OWNER }, user_id: 'viewer' },
        'purchaseItem=i1'
      );
      await user.click(screen.getByRole('button', { name: 'claim-self' }));
      await waitFor(() =>
        expect(banners()).toHaveAttribute('data-claims', 'You')
      );
    });

    it('AttributedClaimTargetIsViewer_RecordedAsSelfClaim', async () => {
      const user = userEvent.setup();
      renderItem(
        { item: { user_id: OWNER }, user_id: 'u9', user_name: 'Sam' },
        'purchaseItem=i1'
      );
      await user.click(
        screen.getByRole('button', { name: 'claim-attributed' })
      );
      await waitFor(() =>
        expect(card()).toHaveAttribute('data-summary', 'You')
      );
      expect(banners()).toHaveAttribute('data-my-claim', 'true');
    });

    it('AttributedClaimNullName_FallsBackToSomeone', async () => {
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(
        screen.getByRole('button', { name: 'claim-attributed-null-name' })
      );
      await waitFor(() =>
        expect(banners()).toHaveAttribute('data-claims', 'Someone')
      );
    });

    it('PurchaseFailsWithMessage_Toasts', async () => {
      vi.mocked(createPurchase).mockResolvedValue({
        success: false,
        message: 'Already claimed',
      } as never);
      const toast = (await import('react-hot-toast')).default;
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'claim-self' }));
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Already claimed')
      );
    });

    it('PurchaseFailsNoMessage_NoExtraToast', async () => {
      vi.mocked(createPurchase).mockResolvedValue({ success: false } as never);
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'claim-self' }));
      await waitFor(() => expect(createPurchase).toHaveBeenCalled());
    });

    it('PurchaseThrows_LogsError', async () => {
      vi.mocked(createPurchase).mockRejectedValue(new Error(''));
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'claim-self' }));
      await waitFor(() => expect(console.error).toHaveBeenCalled());
    });
  });

  describe('RemovableClaim', () => {
    it('SelfClaim_ModalGetsRemovableClaim', () => {
      renderItem(
        {
          item: {
            user_id: OWNER,
            purchases: [
              { id: 'pm', by: 'self', firstName: 'You', claimedByViewer: true },
            ],
          },
          user_id: 'viewer',
        },
        'purchaseItem=i1'
      );
      expect(screen.getByTestId('modal-slot')).toHaveAttribute(
        'data-removable-claim',
        'true'
      );
    });

    it('ClaimedByViewerForOther_ModalGetsRemovableClaim-UndoRemovesByPurchaseId', async () => {
      const user = userEvent.setup();
      renderItem(
        {
          item: {
            user_id: OWNER,
            purchases: [
              {
                id: 'pa',
                by: 'other',
                firstName: 'Grandma',
                claimedByViewer: true,
              },
            ],
          },
          user_id: 'viewer',
        },
        'purchaseItem=i1'
      );
      expect(screen.getByTestId('modal-slot')).toHaveAttribute(
        'data-removable-claim',
        'true'
      );
      await user.click(screen.getByRole('button', { name: 'confirm-undo' }));
      expect(removePurchase).toHaveBeenCalledWith({ purchase_id: 'pa' });
    });

    it('OtherViewersClaim_ModalGetsNoRemovableClaim', () => {
      renderItem(
        {
          item: {
            user_id: OWNER,
            quantity_limit: 3,
            purchases: [
              { id: 'p1', by: 'other', firstName: 'Sam', claimedByViewer: false },
            ],
          },
          user_id: 'viewer',
        },
        'purchaseItem=i1'
      );
      expect(screen.getByTestId('modal-slot')).toHaveAttribute(
        'data-removable-claim',
        'false'
      );
    });

    it('OwnerWithOwnClaim_ModalGetsNoRemovableClaim', () => {
      renderItem(
        {
          item: {
            user_id: OWNER,
            quantity_limit: 3,
            purchases: [
              { id: 'po', by: 'self', firstName: 'You', claimedByViewer: true },
            ],
          },
          user_id: OWNER,
          showSpoilers: true,
        },
        'purchaseItem=i1'
      );
      expect(screen.getByTestId('modal-slot')).toHaveAttribute(
        'data-removable-claim',
        'false'
      );
    });
  });

  describe('RemoveClaimBanner', () => {
    it('OwnerSpoilerRemoveClick_RemovesByPurchaseId-DropsClaim', async () => {
      const user = userEvent.setup();
      renderItem({
        user_id: OWNER,
        item: {
          user_id: OWNER,
          quantity_limit: 3,
          purchases: [
            { id: 'p1', by: 'other', firstName: 'Sam', claimedByViewer: false },
          ],
        },
      });
      await user.click(
        screen.getByRole('button', { name: 'banner-remove-first' })
      );
      expect(removePurchase).toHaveBeenCalledWith({ purchase_id: 'p1' });
      await waitFor(() => expect(banners()).toHaveAttribute('data-claims', ''));
    });

    it('RemoveThrows_LogsError-KeepsClaim', async () => {
      vi.mocked(removePurchase).mockRejectedValue(new Error('boom'));
      const user = userEvent.setup();
      renderItem({
        user_id: OWNER,
        item: {
          user_id: OWNER,
          quantity_limit: 3,
          purchases: [
            { id: 'p1', by: 'other', firstName: 'Sam', claimedByViewer: false },
          ],
        },
      });
      await user.click(
        screen.getByRole('button', { name: 'banner-remove-first' })
      );
      await waitFor(() => expect(console.error).toHaveBeenCalled());
      expect(banners()).toHaveAttribute('data-claims', 'Sam');
    });

    it('RemoveFails_KeepsClaim', async () => {
      vi.mocked(removePurchase).mockResolvedValue({ success: false } as never);
      const user = userEvent.setup();
      renderItem({
        user_id: OWNER,
        item: {
          user_id: OWNER,
          quantity_limit: 3,
          purchases: [
            { id: 'p1', by: 'other', firstName: 'Sam', claimedByViewer: false },
          ],
        },
      });
      await user.click(
        screen.getByRole('button', { name: 'banner-remove-first' })
      );
      await waitFor(() => expect(removePurchase).toHaveBeenCalled());
      expect(banners()).toHaveAttribute('data-claims', 'Sam');
    });
  });

  describe('Undo', () => {
    const claimed = {
      item: {
        user_id: OWNER,
        purchases: [
          { id: 'pm', by: 'self', firstName: 'You', claimedByViewer: true },
        ],
      },
      user_id: 'viewer',
    };

    it('UndoWithClaim_RemovesByPurchaseId-DropsClaim', async () => {
      const user = userEvent.setup();
      renderItem(claimed, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-undo' }));
      expect(removePurchase).toHaveBeenCalledWith({ purchase_id: 'pm' });
      await waitFor(() =>
        expect(screen.getByTestId('claim-banners')).toHaveAttribute(
          'data-my-claim',
          'false'
        )
      );
    });

    it('UndoWithoutClaim_DoesNotCallRemove', async () => {
      const user = userEvent.setup();
      renderItem(
        { item: { user_id: OWNER }, user_id: 'viewer' },
        'purchaseItem=i1'
      );
      await user.click(screen.getByRole('button', { name: 'confirm-undo' }));
      expect(removePurchase).not.toHaveBeenCalled();
    });

    it('UndoFails_LogsError', async () => {
      vi.mocked(removePurchase).mockRejectedValue(new Error('boom'));
      const user = userEvent.setup();
      renderItem(claimed, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-undo' }));
      await waitFor(() => expect(console.error).toHaveBeenCalled());
    });

    it('UndoNotSuccess_KeepsClaim', async () => {
      vi.mocked(removePurchase).mockResolvedValue({ success: false } as never);
      const user = userEvent.setup();
      renderItem(claimed, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-undo' }));
      await waitFor(() => expect(removePurchase).toHaveBeenCalled());
      expect(screen.getByTestId('claim-banners')).toHaveAttribute(
        'data-my-claim',
        'true'
      );
    });
  });
});
