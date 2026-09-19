/* eslint-disable testing-library/no-node-access --
 * The progress disc and the facepile are decorative (`aria-hidden`), so neither
 * carries a role to query by — both are reached through their classes.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PurchaseView } from '@/lib/types';
import ClaimBanners from '../ClaimBanners';

const claim = (id: string): PurchaseView => ({
  id,
  by: 'other',
  name: `Claimer ${id}`,
  claimedByViewer: false,
});

function mountBanner(
  overrides: Partial<React.ComponentProps<typeof ClaimBanners>> = {}
) {
  render(
    <ClaimBanners
      claimed={0}
      quantity={8}
      withheld={false}
      claims={[]}
      {...overrides}
    />
  );
  return screen.getByRole(overrides.claims?.length ? 'button' : 'status');
}

// The fraction the disc is painted from, read off the custom property the
// stylesheet fills it with.
function progressOf(banner: HTMLElement): string | undefined {
  return banner
    .querySelector<HTMLElement>('.progress-disc-inside')
    ?.style.getPropertyValue('--progress');
}

const discsIn = (banner: HTMLElement) =>
  banner.querySelectorAll('.altvatar-disc');

describe('ClaimBanners', () => {
  describe('Readout', () => {
    it('NothingClaimed_ShowsTheZeroCountAndAnUnfilledDisc', () => {
      const banner = mountBanner({ claimed: 0, quantity: 3 });
      expect(banner).toHaveTextContent('0 / 3 Claimed');
      expect(progressOf(banner)).toBe('0');
    });

    it('PartiallyClaimed_FillsTheDiscToTheFraction', () => {
      const banner = mountBanner({ claimed: 1, quantity: 4 });
      expect(banner).toHaveTextContent('1 / 4 Claimed');
      expect(progressOf(banner)).toBe('0.25');
    });

    it('ListCountGiven_SaysHowManyListsTheCounterSpans', () => {
      expect(
        mountBanner({ claimed: 3, quantity: 5, lists: 2 })
      ).toHaveTextContent('3 / 5 Claimed on 2 lists');
    });

    it('ListCountGivenWithCountWithheld_SaysTheSpanAfterTheAsk', () => {
      expect(
        mountBanner({ claimed: 3, quantity: 5, withheld: true, lists: 1 })
      ).toHaveTextContent('5 wanted on 1 list');
    });

    it('CountWithheld_ShowsTheAskAndDisclosesNoProgress', () => {
      const banner = mountBanner({ claimed: 3, quantity: 3, withheld: true });
      expect(banner).toHaveTextContent('3 wanted');
      expect(banner).not.toHaveTextContent('Claimed');
      expect(progressOf(banner)).toBe('0');
    });
  });

  /**
   * The banner opens exactly where it has claims it may name. Everywhere else
   * — nothing claimed, a tier that withholds the count, and the library card,
   * whose totals span every list and name no single entry — it is the status
   * readout it has always been, with no cue that anything could open.
   */
  describe('OpensTheRoster', () => {
    const claimed = {
      claimed: 2,
      quantity: 4,
      claims: [claim('a'), claim('b')],
      onOpenRoster: vi.fn(),
    };

    it('ClaimsTierWithClaims_IsAButtonAnnouncingItOpensADialog', () => {
      const banner = mountBanner(claimed);
      expect(banner).toHaveAttribute('aria-haspopup', 'dialog');
      expect(banner).toHaveAccessibleName('2 / 4 Claimed');
    });

    it('ClaimsTierWithClaims_CarriesOneDiscPerClaimer', () => {
      expect(discsIn(mountBanner(claimed))).toHaveLength(2);
    });

    it('MoreClaimersThanTheFacepileDraws_ShowsThreeDiscsAndTheOverflow', () => {
      const banner = mountBanner({
        ...claimed,
        claimed: 5,
        quantity: 5,
        claims: ['a', 'b', 'c', 'd', 'e'].map(claim),
      });
      expect(discsIn(banner)).toHaveLength(3);
      expect(banner).toHaveTextContent('+2');
    });

    it('Activation_FiresOnOpenRoster', async () => {
      const user = userEvent.setup();
      const onOpenRoster = vi.fn();
      await user.click(mountBanner({ ...claimed, onOpenRoster }));
      expect(onOpenRoster).toHaveBeenCalledTimes(1);
    });

    it('NoClaims_StaysAStatusReadoutWithNoFacepile', () => {
      const banner = mountBanner({ ...claimed, claimed: 0, claims: [] });
      expect(banner).toHaveAttribute('role', 'status');
      expect(discsIn(banner)).toHaveLength(0);
    });

    it('BelowClaimsTier_StaysAStatusReadoutWithNoFacepile', () => {
      render(
        <ClaimBanners
          claimed={2}
          quantity={4}
          withheld
          claims={claimed.claims}
          onOpenRoster={vi.fn()}
        />
      );
      const banner = screen.getByRole('status');
      expect(discsIn(banner)).toHaveLength(0);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('LibraryCard_StaysAStatusReadoutWithNoFacepile', () => {
      render(<ClaimBanners {...claimed} withheld={false} lists={3} />);
      const banner = screen.getByRole('status');
      expect(discsIn(banner)).toHaveLength(0);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    // The card's live preview inside the item form hands no opener, and a
    // banner with nowhere to go must not advertise one.
    it('NoOpenerGiven_StaysAStatusReadoutWithNoFacepile', () => {
      render(
        <ClaimBanners claimed={2} quantity={4} withheld={false} claims={claimed.claims} />
      );
      const banner = screen.getByRole('status');
      expect(discsIn(banner)).toHaveLength(0);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
