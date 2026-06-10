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
    >
      <button type="button" onClick={p.onPurchaseClick as () => void}>
        card-claim
      </button>
    </div>
  ),
}));
vi.mock('../ClaimBanners', () => ({
  default: (p: Record<string, unknown>) => (
    <div
      data-testid="claim-banners"
      data-summary={p.claimSummary as string}
      data-my-claim={String(!!p.myClaim)}
    >
      <button type="button" onClick={p.onUndo as () => void}>
        banner-undo
      </button>
    </div>
  ),
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
    <div data-testid="modal-slot" data-my-claim={String(!!p.myClaim)}>
      <button
        type="button"
        onClick={() =>
          (p.onPurchaseConfirm as (n: string, u?: boolean) => void)(
            'Vicky',
            true
          )
        }
      >
        confirm-self
      </button>
      <button
        type="button"
        onClick={() =>
          (p.onPurchaseConfirm as (n: string, u?: boolean) => void)(
            'Sam Lee',
            false
          )
        }
      >
        confirm-guest
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
          purchases: [{ id: 'p1', by: 'other', firstName: 'Sam' }],
        },
        user_id: 'viewer',
      });
      expect(card()).toHaveAttribute('data-show-purchased', 'true');
      expect(card()).toHaveAttribute('data-disabled', 'true');
      expect(banners()).toHaveAttribute('data-summary', 'Sam');
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
          purchases: [{ id: 'p1', by: 'other', firstName: 'Sam' }],
        },
      });
      expect(card()).toHaveAttribute('data-show-spoiler', 'true');
    });

    it('NoClaims_ForwardsEmptySummary', () => {
      renderItem({ item: { user_id: OWNER }, user_id: 'viewer' });
      expect(banners()).toHaveAttribute('data-summary', '');
    });

    it('SelfClaim_ForwardsYouSummaryAndMyClaim', () => {
      renderItem({
        item: {
          user_id: OWNER,
          purchases: [{ id: 'pm', by: 'self', firstName: 'You' }],
        },
        user_id: 'viewer',
      });
      expect(banners()).toHaveAttribute('data-summary', 'You');
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
      expect(banners()).toHaveAttribute('data-summary', '');
      rerender(
        <Item
          item={makeItem({
            user_id: OWNER,
            purchases: [{ id: 'p9', by: 'other', firstName: 'Sam' }],
          })}
          user_id="viewer"
        />
      );
      expect(banners()).toHaveAttribute('data-summary', 'Sam');
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
  });

  describe('Claim', () => {
    const viewer = {
      item: { user_id: OWNER },
      user_id: 'viewer',
      user_name: 'Vicky',
    };

    it('SelfConfirm_CreatePurchaseNullGuest-AddsOptimisticSelfClaim', async () => {
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-self' }));
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

    it('GuestConfirm_CreatePurchaseWithName-AddsOtherClaim', async () => {
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-guest' }));
      expect(createPurchase).toHaveBeenCalledWith({
        item_id: 'i1',
        guest_name: 'Sam Lee',
      });
      // firstToken keeps only the first word of the optimistic display name.
      await waitFor(() =>
        expect(screen.getByTestId('claim-banners')).toHaveAttribute(
          'data-summary',
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
      await user.click(screen.getByRole('button', { name: 'confirm-self' }));
      expect(createPurchase).toHaveBeenCalledWith({
        item_id: '',
        guest_name: null,
      });
    });

    it('PurchaseFailsWithMessage_Toasts', async () => {
      vi.mocked(createPurchase).mockResolvedValue({
        success: false,
        message: 'Already claimed',
      } as never);
      const toast = (await import('react-hot-toast')).default;
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-self' }));
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Already claimed')
      );
    });

    it('PurchaseFailsNoMessage_NoExtraToast', async () => {
      vi.mocked(createPurchase).mockResolvedValue({ success: false } as never);
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-self' }));
      await waitFor(() => expect(createPurchase).toHaveBeenCalled());
    });

    it('PurchaseThrows_LogsError', async () => {
      vi.mocked(createPurchase).mockRejectedValue(new Error(''));
      const user = userEvent.setup();
      renderItem(viewer, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-self' }));
      await waitFor(() => expect(console.error).toHaveBeenCalled());
    });
  });

  describe('Undo', () => {
    const claimed = {
      item: {
        user_id: OWNER,
        purchases: [{ id: 'pm', by: 'self', firstName: 'You' }],
      },
      user_id: 'viewer',
    };

    it('UndoWithClaim_RemovesByPurchaseId-DropsClaim', async () => {
      const user = userEvent.setup();
      renderItem(claimed, 'purchaseItem=i1');
      await user.click(screen.getByRole('button', { name: 'confirm-undo' }));
      expect(removePurchase).toHaveBeenCalledWith({
        purchase_id: 'pm',
        guest_name: null,
      });
      await waitFor(() =>
        expect(screen.getByTestId('claim-banners')).toHaveAttribute(
          'data-my-claim',
          'false'
        )
      );
    });

    it('UndoWithoutClaim_RemovesByItemId', async () => {
      const user = userEvent.setup();
      renderItem(
        { item: { user_id: OWNER }, user_id: 'viewer' },
        'purchaseItem=i1'
      );
      await user.click(screen.getByRole('button', { name: 'confirm-undo' }));
      expect(removePurchase).toHaveBeenCalledWith({
        item_id: 'i1',
        guest_name: null,
      });
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
