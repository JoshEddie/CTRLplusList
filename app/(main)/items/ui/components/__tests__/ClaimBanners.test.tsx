import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseView } from '@/lib/types';
import ClaimBanners from '../ClaimBanners';

const claim: PurchaseView = { id: 'p1', by: 'self', firstName: 'You' };

function renderBanners(
  overrides: Partial<React.ComponentProps<typeof ClaimBanners>> = {}
) {
  const props: React.ComponentProps<typeof ClaimBanners> = {
    showPurchased: false,
    myClaim: null,
    isOwner: false,
    showSpoilerInfo: false,
    claimSummary: '',
    counterText: '1/3 claimed',
    onUndo: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ClaimBanners {...props} />) };
}

describe('ClaimBanners', () => {
  it('PurchasedByOthers_ShowsClaimedBanner', () => {
    renderBanners({ showPurchased: true, claimSummary: 'Sam' });
    expect(screen.getByRole('status')).toHaveTextContent('Claimed by Sam');
  });

  it('PurchasedButMine_SuppressesOthersBanner', () => {
    renderBanners({ showPurchased: true, myClaim: claim, claimSummary: 'You' });
    expect(screen.queryByText(/Claimed by/)).not.toBeInTheDocument();
    expect(screen.getByText('You claimed this')).toBeInTheDocument();
  });

  it('MyClaim_ShowsYouClaimedBanner-UndoFiresCallback', async () => {
    const user = userEvent.setup();
    const { props } = renderBanners({ myClaim: claim });
    expect(screen.getByText('You claimed this')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove your claim' }));
    expect(props.onUndo).toHaveBeenCalledTimes(1);
  });

  it('OwnerWithMyClaim_DoesNotShowMineBanner', () => {
    renderBanners({ myClaim: claim, isOwner: true });
    expect(screen.queryByText('You claimed this')).not.toBeInTheDocument();
  });

  it('SpoilerWithSummary_AppendsNames', () => {
    renderBanners({ showSpoilerInfo: true, claimSummary: 'Sam, Jo' });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Spoilers: 1/3 claimed — Sam, Jo'
    );
  });

  it('SpoilerWithoutSummary_OmitsNameSuffix', () => {
    renderBanners({ showSpoilerInfo: true });
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Spoilers: 1/3 claimed');
    expect(banner.textContent).not.toContain('—');
  });

  it('NoFlags_RendersNothing', () => {
    renderBanners();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
