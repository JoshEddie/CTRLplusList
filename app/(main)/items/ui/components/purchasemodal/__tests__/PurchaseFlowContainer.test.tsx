import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClaimPickerForItem } from '@/lib/data/user.actions';
import { PurchaseView } from '@/lib/types';
import PurchaseFlowContainer from '../PurchaseFlowContainer';

// user.actions is a 'use server' module whose import chain reaches the DB
// driver; the picker read and the sign-in action are the only contracts the
// modal consumes.
vi.mock('@/lib/data/user.actions', () => ({
  getClaimPickerForItem: vi.fn(),
  signInUser: vi.fn(),
}));

const PICKER = {
  ownerName: 'Olivia Owner',
  pool: [
    { id: 'u2', name: 'Sam Smith', image: null },
    { id: 'u3', name: 'Jo Jones', image: null },
  ],
};

const ITEM = {
  id: 'i1',
  name: 'Fancy Mug',
  description: '',
  image_url: '',
  stores: [
    { name: 'Target', link: 'https://t.example', price: '38.00' },
    { name: 'Amazon', link: 'https://a.example', price: '35.50' },
  ],
} as never;

function renderContainer(
  overrides: Partial<React.ComponentProps<typeof PurchaseFlowContainer>> = {}
) {
  const props: React.ComponentProps<typeof PurchaseFlowContainer> = {
    user_id: 'viewer',
    isOwner: false,
    showSpoilers: false,
    ownerCanClaim: false,
    ownerClaims: [],
    item: ITEM,
    onSelfClaim: vi.fn(),
    onAttributedClaim: vi.fn(),
    onGuestClaim: vi.fn(),
    onRemoveClaim: vi.fn(),
    ...overrides,
  };
  render(<PurchaseFlowContainer {...props} />);
  return props;
}

const disclosureTrigger = (name = 'Claiming for someone else?') =>
  screen.getByRole('button', { name: new RegExp(name.replace('?', '\\?')) });

async function expandLoadedDisclosure(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('button', { name: 'Claim this gift' });
  await user.click(disclosureTrigger());
  return screen.findByRole('button', { name: /Sam Smith/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClaimPickerForItem).mockResolvedValue(PICKER);
});

describe('PurchaseFlowContainer', () => {
  describe('StoreRow', () => {
    it('Authenticated_RendersCheapestStoreAsNewTabGhostLink', () => {
      renderContainer();
      const link = screen.getByRole('link', { name: /Amazon/ });
      expect(link).toHaveAttribute('href', 'https://a.example');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noreferrer');
    });

    it('Guest_StoreRowRendersWithoutSignIn', () => {
      renderContainer({ user_id: undefined });
      expect(screen.getByRole('link', { name: /Amazon/ })).toBeInTheDocument();
    });

    it('OwnerSpoilersOff_StoreRowRenders', () => {
      renderContainer({ isOwner: true, showSpoilers: false });
      expect(screen.getByRole('link', { name: /Amazon/ })).toBeInTheDocument();
    });

    it('PlusNStoresTrigger_OpensMenuWithAllStoresPriceAscending', async () => {
      renderContainer();
      await screen.findByRole('button', { name: 'Claim this gift' });
      // fireEvent: userEvent's synthetic hover would open-then-toggle the
      // hover-opened menu shut.
      fireEvent.click(screen.getByRole('button', { name: '+1 store' }));
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(2);
      expect(menuItems[0]).toHaveTextContent('Amazon');
      expect(menuItems[0]).toHaveTextContent('$35.50');
      expect(menuItems[1]).toHaveTextContent('Target');
      expect(menuItems[1]).toHaveTextContent('$38.00');
    });

    it('EscapeWhileMenuOpen_ClosesMenuOnly', async () => {
      const user = userEvent.setup();
      renderContainer();
      await screen.findByRole('button', { name: 'Claim this gift' });
      fireEvent.click(screen.getByRole('button', { name: '+1 store' }));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: '+1 store' })
      ).toHaveFocus();
    });

    it('NoValidStore_RendersClaimSectionWithoutStoreRow', async () => {
      renderContainer({
        item: { ...((ITEM as object) ?? {}), stores: [] } as never,
      });
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: 'Claim this gift' })
      ).toBeInTheDocument();
    });
  });

  describe('Guest', () => {
    it('NoUserId_RendersGuestFieldAndFooterSignIn-NoPickerFetch', () => {
      renderContainer({ user_id: undefined });
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
      const { onGuestClaim } = renderContainer({ user_id: undefined });
      const guestBtn = screen.getByRole('button', { name: 'Claim as Guest' });
      expect(guestBtn).toBeDisabled();
      await user.click(guestBtn);
      expect(onGuestClaim).not.toHaveBeenCalled();
    });

    it('PaddedGuestName_CallsOnGuestClaimTrimmed', async () => {
      const user = userEvent.setup();
      const { onGuestClaim } = renderContainer({ user_id: undefined });
      await user.type(screen.getByLabelText('Your name'), '  Bob  ');
      await user.click(screen.getByRole('button', { name: 'Claim as Guest' }));
      expect(onGuestClaim).toHaveBeenCalledWith('Bob');
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
      await user.click(
        screen.getByRole('button', { name: 'Claim this gift' })
      );
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
      expect(onAttributedClaim).toHaveBeenCalledWith(PICKER.pool[0]);
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
      expect(onGuestClaim).toHaveBeenCalledWith('Aunt May');
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
          pool: [{ id: 'u7', name: 'Fresh Fred', image: null }],
        });
      const user = userEvent.setup();
      const props: React.ComponentProps<typeof PurchaseFlowContainer> = {
        user_id: 'viewer',
        isOwner: false,
        showSpoilers: false,
        ownerCanClaim: false,
        ownerClaims: [],
        item: ITEM,
        onSelfClaim: vi.fn(),
        onAttributedClaim: vi.fn(),
        onGuestClaim: vi.fn(),
        onRemoveClaim: vi.fn(),
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
        user_id: 'viewer',
        isOwner: false,
        showSpoilers: false,
        ownerCanClaim: false,
        ownerClaims: [],
        item: ITEM,
        onSelfClaim: vi.fn(),
        onAttributedClaim: vi.fn(),
        onGuestClaim: vi.fn(),
        onRemoveClaim: vi.fn(),
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

  describe('Owner', () => {
    it('SpoilersOff_RendersYourListLabelOnly-NoClaimUI-NoPickerFetch', () => {
      renderContainer({ isOwner: true, showSpoilers: false });
      expect(screen.getByText('Your list')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'I bought this myself' })
      ).not.toBeInTheDocument();
      expect(getClaimPickerForItem).not.toHaveBeenCalled();
    });

    it('SpoilersOn_RendersOwnerCtaAndOwnerDisclosure', async () => {
      const user = userEvent.setup();
      const { onSelfClaim } = renderContainer({
        isOwner: true,
        showSpoilers: true,
        ownerCanClaim: true,
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

    it('SpoilersOn_OwnerClaimsListRemove-DispatchesOnRemoveClaim', async () => {
      const user = userEvent.setup();
      const claim: PurchaseView = {
        id: 'pc1',
        by: 'other',
        firstName: 'Bob',
        claimerFirstName: 'Alice',
        claimedByViewer: false,
      };
      const { onRemoveClaim } = renderContainer({
        isOwner: true,
        showSpoilers: true,
        ownerCanClaim: true,
        ownerClaims: [claim],
      });
      expect(screen.getByText('Bob — added by Alice')).toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: "Remove Bob's claim" })
      );
      expect(onRemoveClaim).toHaveBeenCalledWith(claim);
    });
  });
});
