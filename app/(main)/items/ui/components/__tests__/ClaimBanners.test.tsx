import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClaimBanners from '../ClaimBanners';

function mountBanner(
  overrides: Partial<React.ComponentProps<typeof ClaimBanners>> = {}
) {
  render(
    <ClaimBanners claimed={0} quantity={8} withheld={false} {...overrides} />
  );
  return screen.getByRole('status');
}

// The fraction the disc is painted from, read off the custom property the
// stylesheet fills it with.
function progressOf(banner: HTMLElement): string | undefined {
  return banner
    .querySelector<HTMLElement>('.progress-disc-inside')
    ?.style.getPropertyValue('--progress');
}

describe('ClaimBanners', () => {
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
    expect(mountBanner({ claimed: 3, quantity: 5, lists: 2 })).toHaveTextContent(
      '3 / 5 Claimed on 2 lists'
    );
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
