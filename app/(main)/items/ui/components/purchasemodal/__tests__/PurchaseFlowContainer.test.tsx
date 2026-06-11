import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClaimPickerForItem } from '@/lib/data/user.actions';
import PurchaseFlowContainer from '../PurchaseFlowContainer';

// SignInButton mounts a server-action <form action={signInUser}>; stub it so the
// guest branch can assert the sign-in affordance without importing the action.
vi.mock('@/app/(auth)/ui/components/SignInButton', () => ({
  default: () => <div data-testid="signin-button" />,
}));

// user.actions is a 'use server' module whose import chain reaches the DB
// driver; the picker read is the only contract the modal consumes.
vi.mock('@/lib/data/user.actions', () => ({
  getClaimPickerForItem: vi.fn(),
}));

const PICKER = {
  ownerName: 'Olivia Owner',
  pool: [
    { id: 'u2', name: 'Sam Smith', image: null },
    { id: 'u3', name: 'Jo Jones', image: null },
  ],
};

function renderContainer(
  overrides: Partial<React.ComponentProps<typeof PurchaseFlowContainer>> = {}
) {
  const props: React.ComponentProps<typeof PurchaseFlowContainer> = {
    user_id: 'viewer',
    isOwner: false,
    itemId: 'i1',
    itemName: 'Fancy Mug',
    onSelfClaim: vi.fn(),
    onAttributedClaim: vi.fn(),
    onGuestClaim: vi.fn(),
    ...overrides,
  };
  render(<PurchaseFlowContainer {...props} />);
  return props;
}

const samRow = () => screen.findByRole('button', { name: 'Sam Smith' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClaimPickerForItem).mockResolvedValue(PICKER);
});

describe('PurchaseFlowContainer', () => {
  describe('Guest', () => {
    it('NoUserId_RendersSignIn-GuestNameField-NoPickerFetch', () => {
      renderContainer({ user_id: undefined });
      expect(screen.getByTestId('signin-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Your name')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Claim as Guest' })
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
    it('Render_ShowsClaimThisGiftHeader-ItemNameSubtitle', async () => {
      renderContainer();
      expect(
        screen.getByRole('heading', { name: 'Claim this gift' })
      ).toBeInTheDocument();
      expect(screen.getByText('Fancy Mug')).toBeInTheDocument();
      await samRow();
    });

    it('ViewerCtaClick_CallsOnSelfClaim', async () => {
      const user = userEvent.setup();
      const { onSelfClaim } = renderContainer();
      await user.click(screen.getByRole('button', { name: "I'm getting this" }));
      expect(onSelfClaim).toHaveBeenCalledTimes(1);
      await samRow();
    });

    it('PoolLoaded_RendersOwnerFirstNameDivider-OneRowPerPoolUser', async () => {
      renderContainer();
      expect(await samRow()).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Jo Jones' })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Claim for someone in Olivia's circle:")
      ).toBeInTheDocument();
    });

    it('PoolRowClick_CallsOnAttributedClaimWithThatUser', async () => {
      const user = userEvent.setup();
      const { onAttributedClaim } = renderContainer();
      await user.click(await samRow());
      expect(onAttributedClaim).toHaveBeenCalledWith(PICKER.pool[0]);
    });

    it('SearchQuery_NarrowsPoolRowsCaseInsensitive', async () => {
      const user = userEvent.setup();
      renderContainer();
      await samRow();
      await user.type(screen.getByRole('searchbox'), 'JO');
      expect(
        screen.getByRole('button', { name: 'Jo Jones' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Sam Smith' })
      ).not.toBeInTheDocument();
    });

    it('ClearSearchClick_ResetsQueryAndRestoresFullPool', async () => {
      const user = userEvent.setup();
      renderContainer();
      await samRow();
      await user.type(screen.getByRole('searchbox'), 'JO');
      expect(
        screen.queryByRole('button', { name: 'Sam Smith' })
      ).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(await samRow()).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Jo Jones' })
      ).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toHaveValue('');
    });

    it('NullNamePoolUser_NeverMatchesQuery', async () => {
      vi.mocked(getClaimPickerForItem).mockResolvedValue({
        ownerName: 'Olivia Owner',
        pool: [
          { id: 'u2', name: 'Sam Smith', image: null },
          { id: 'u5', name: null, image: null },
        ],
      });
      const user = userEvent.setup();
      renderContainer();
      await samRow();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      await user.type(screen.getByRole('searchbox'), 'sam');
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(await samRow()).toBeInTheDocument();
    });

    it('ItemIdChangesMidFlight_StaleResponseDiscarded', async () => {
      let resolveStale!: (p: typeof PICKER) => void;
      vi.mocked(getClaimPickerForItem)
        .mockReturnValueOnce(
          new Promise((res) => {
            resolveStale = res;
          })
        )
        .mockResolvedValueOnce({
          ownerName: 'Olivia Owner',
          pool: [{ id: 'u7', name: 'Fresh Fred', image: null }],
        });
      const props: React.ComponentProps<typeof PurchaseFlowContainer> = {
        user_id: 'viewer',
        isOwner: false,
        itemId: 'i1',
        itemName: 'Fancy Mug',
        onSelfClaim: vi.fn(),
        onAttributedClaim: vi.fn(),
        onGuestClaim: vi.fn(),
      };
      const { rerender } = render(<PurchaseFlowContainer {...props} />);
      rerender(<PurchaseFlowContainer {...props} itemId="i2" />);
      expect(
        await screen.findByRole('button', { name: 'Fresh Fred' })
      ).toBeInTheDocument();
      await act(async () => {
        resolveStale(PICKER);
      });
      expect(
        screen.queryByRole('button', { name: 'Sam Smith' })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Fresh Fred' })
      ).toBeInTheDocument();
    });

    it('SearchNoMatch_ShowsAddThemBelowEmptyState', async () => {
      const user = userEvent.setup();
      renderContainer();
      await samRow();
      await user.type(screen.getByRole('searchbox'), 'zzz');
      expect(
        screen.getByText('No one by that name — add them below')
      ).toBeInTheDocument();
    });

    it('FallbackToggleClick_ExpandsNameField-PaddedNameCallsOnGuestClaimTrimmed', async () => {
      const user = userEvent.setup();
      const { onGuestClaim } = renderContainer();
      await samRow();
      expect(screen.queryByLabelText('Their name')).not.toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: 'Someone not listed? Enter their name' })
      );
      await user.type(screen.getByLabelText('Their name'), ' Aunt May ');
      await user.click(
        screen.getByRole('button', { name: 'Claim for Aunt May' })
      );
      expect(onGuestClaim).toHaveBeenCalledWith('Aunt May');
    });

    it('FallbackEmptyName_SubmitDisabled-NoCallback', async () => {
      const user = userEvent.setup();
      const { onGuestClaim } = renderContainer();
      await samRow();
      await user.click(
        screen.getByRole('button', { name: 'Someone not listed? Enter their name' })
      );
      const submit = screen.getByRole('button', { name: 'Claim for …' });
      expect(submit).toBeDisabled();
      await user.click(submit);
      expect(onGuestClaim).not.toHaveBeenCalled();
    });

    it('PendingPicker_ShowsLoadingRow', () => {
      vi.mocked(getClaimPickerForItem).mockReturnValue(
        new Promise(() => {})
      );
      renderContainer();
      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('NullPicker_FallsBackToTheOwnerLabel-EmptyState', async () => {
      vi.mocked(getClaimPickerForItem).mockResolvedValue(null);
      renderContainer();
      expect(
        await screen.findByText('No one by that name — add them below')
      ).toBeInTheDocument();
      expect(
        screen.getByText("Claim for someone in the owner's circle:")
      ).toBeInTheDocument();
    });
  });

  describe('Owner', () => {
    it('OwnerCtaClick_RendersIBoughtThisMyself-CallsOnSelfClaim', async () => {
      const user = userEvent.setup();
      const { onSelfClaim } = renderContainer({ isOwner: true });
      await user.click(
        screen.getByRole('button', { name: 'I bought this myself' })
      );
      expect(onSelfClaim).toHaveBeenCalledTimes(1);
      await samRow();
    });

    it('Render_UsesYourCircleDivider', async () => {
      renderContainer({ isOwner: true });
      expect(
        screen.getByText('Claim for someone in your circle:')
      ).toBeInTheDocument();
      await samRow();
    });
  });
});
