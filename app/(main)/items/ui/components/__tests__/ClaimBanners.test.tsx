/* eslint-disable testing-library/no-node-access --
 * The progress disc and the facepile are decorative (`aria-hidden`), so neither
 * carries a role to query by — both are reached through their classes.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MAX_ENTRY_QUANTITY } from '@/lib/data/listItems.schema';
import ClaimBanners from '../ClaimBanners';
import { makeClaim } from './test-helpers';

type BannerProps = React.ComponentProps<typeof ClaimBanners>;

// Named per call so the expected role is stated by the test rather than
// inferred from the props — the inert cases are the ones worth naming.
function mountBanner(
  overrides: Partial<BannerProps> = {},
  role: 'status' | 'button' | 'group' = 'status'
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
  return screen.getByRole(role);
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
   * — nothing claimed, a tier that withholds the count, the library card whose
   * totals name no single entry, and the form's live preview, which is handed
   * no opener — it is the status readout it has always been, with no cue that
   * anything could open.
   */
  describe('OpensTheRoster', () => {
    const opening: Partial<BannerProps> = {
      claimed: 2,
      quantity: 4,
      claims: [makeClaim('a'), makeClaim('b')],
      onOpenRoster: vi.fn(),
    };

    it('ClaimsTierWithClaims_AnnouncesItOpensADialog-NamesItselfByItsCount-CarriesOneDiscPerClaimer', () => {
      const banner = mountBanner(opening, 'button');
      expect(banner).toHaveAttribute('aria-haspopup', 'dialog');
      expect(banner).toHaveAccessibleName('2 / 4 Claimed');
      expect(discsIn(banner)).toHaveLength(2);
    });

    it('MoreClaimersThanTheFacepileDraws_ShowsThreeDiscsAndTheOverflow', () => {
      const banner = mountBanner(
        {
          ...opening,
          claimed: 5,
          quantity: 5,
          claims: ['a', 'b', 'c', 'd', 'e'].map((id) => makeClaim(id)),
        },
        'button'
      );
      expect(discsIn(banner)).toHaveLength(3);
      expect(banner).toHaveTextContent('+2');
    });

    it('Activation_FiresOnOpenRoster', async () => {
      const user = userEvent.setup();
      const onOpenRoster = vi.fn();
      await user.click(mountBanner({ ...opening, onOpenRoster }, 'button'));
      expect(onOpenRoster).toHaveBeenCalledTimes(1);
    });

    // Each row is the one condition that withdraws the opening, against props
    // that otherwise open — so the case, not the fixture, is what differs.
    const inert: [string, Partial<BannerProps>][] = [
      ['AZeroClaimEntry', { claimed: 0, claims: [] }],
      ['ATierBelowClaims', { withheld: true }],
      ['TheLibraryCard', { lists: 3 }],
      ['ACardWithNoOpener', { onOpenRoster: undefined }],
    ];

    it.each(inert)(
      'On%s_StaysAStatusReadoutWithNoFacepile',
      (_case, override) => {
        const banner = mountBanner({ ...opening, ...override });
        expect(banner).toHaveAttribute('role', 'status');
        expect(discsIn(banner)).toHaveLength(0);
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      }
    );
  });

  // The owner's membership control, fused around the readout: the disc and
  // count stay the same readout, now flanked by the − and + that move the
  // entry's own quantity.
  describe('Step', () => {
    const stepping = (
      quantity: number,
      onChange = vi.fn()
    ): Partial<BannerProps> => ({
      quantity,
      step: { name: 'Puzzle', onChange },
    });

    it('Rendered_GroupLabelNamesTheEntry', () => {
      const banner = mountBanner({ ...stepping(3), claimed: 1 }, 'group');
      expect(banner).toHaveAccessibleName('Quantity for Puzzle');
    });

    it('ClickDecrease_CallsOnChangeWithQuantityMinusOne', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      mountBanner({ ...stepping(3, onChange), claimed: 1 }, 'group');
      await user.click(screen.getByRole('button', { name: 'Decrease' }));
      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('ClickIncrease_CallsOnChangeWithQuantityPlusOne', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      mountBanner({ ...stepping(3, onChange), claimed: 1 }, 'group');
      await user.click(screen.getByRole('button', { name: 'Increase' }));
      expect(onChange).toHaveBeenCalledWith(4);
    });

    it('QuantityZero_DisablesDecrease', () => {
      mountBanner({ ...stepping(0), claimed: 0 }, 'group');
      expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();
    });

    it('QuantityAtMax_DisablesIncrease', () => {
      mountBanner({ ...stepping(MAX_ENTRY_QUANTITY), claimed: 1 }, 'group');
      expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
    });

    it('QuantityZero_PaintsAnEmptyDisc', () => {
      const banner = mountBanner({ ...stepping(0), claimed: 0 }, 'group');
      expect(progressOf(banner)).toBe('0');
    });

    it('Rendered_BoxesTheQuantityInItsOwnElement', () => {
      const banner = mountBanner({ ...stepping(5), claimed: 2 }, 'group');
      expect(banner.querySelector('.purchased-banner-qty')).toHaveTextContent(
        '5'
      );
    });

    it('NoClaims_ReadoutIsAStatus', () => {
      mountBanner({ ...stepping(5), claimed: 2, claims: [] }, 'group');
      expect(screen.getByRole('status')).toHaveTextContent('2 / 5 Claimed');
    });

    it('WithClaims_ReadoutOpensTheRoster-DoesNotCallOnChange', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onOpenRoster = vi.fn();
      mountBanner(
        {
          ...stepping(5, onChange),
          claimed: 2,
          claims: [makeClaim('a'), makeClaim('b')],
          onOpenRoster,
        },
        'group'
      );
      await user.click(screen.getByRole('button', { name: '2 / 5 Claimed' }));
      expect(onOpenRoster).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
