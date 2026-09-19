import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIBRARY_TIER_ROWS } from '@/app/ui/components/spoiler-tier-rows';
import HeroSpoilerControl from '../HeroSpoilerControl';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const sp = vi.hoisted(() => ({
  value: new URLSearchParams() as URLSearchParams | null,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/lists/list-1',
  useSearchParams: () => sp.value,
}));

const option = (name: RegExp) => screen.getByRole('radio', { name });

beforeEach(() => {
  vi.clearAllMocks();
  sp.value = new URLSearchParams();
});

describe('HeroSpoilerControl', () => {
  it('CurrentTier_AriaCheckedTrue', () => {
    render(<HeroSpoilerControl tier="progress" baseline="surprise" />);
    expect(option(/Progress/)).toHaveAttribute('aria-checked', 'true');
  });

  it('SelectOtherTier_ReplacesUrl', async () => {
    const user = userEvent.setup();
    sp.value = new URLSearchParams('page=2');
    render(<HeroSpoilerControl tier="surprise" baseline="surprise" />);
    await user.click(option(/Claimed/));
    expect(router.replace).toHaveBeenCalledWith(
      '/lists/list-1?page=2&spoiler=claims'
    );
  });

  it('SelectCurrentTier_NoNavigation', async () => {
    const user = userEvent.setup();
    render(<HeroSpoilerControl tier="claims" baseline="surprise" />);
    await user.click(option(/Claimed/));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('SelectBaselineWithNoSearchParams_ReplacesWithBarePath', async () => {
    const user = userEvent.setup();
    sp.value = null;
    render(<HeroSpoilerControl tier="claims" baseline="surprise" />);
    await user.click(option(/Surprise/));
    expect(router.replace).toHaveBeenCalledWith('/lists/list-1');
  });

  it('ActiveOption_HasTintBackgroundStyle', () => {
    render(<HeroSpoilerControl tier="surprise" baseline="surprise" />);
    expect(option(/Surprise/)).toHaveStyle({
      backgroundColor: 'var(--spoiler-tint-surprise)',
    });
    expect(option(/Progress/)).not.toHaveStyle({
      backgroundColor: 'var(--spoiler-tint-progress)',
    });
  });

  it('LibraryRows_OmitProgress', () => {
    render(
      <HeroSpoilerControl
        tier="claims"
        baseline="surprise"
        rows={LIBRARY_TIER_ROWS}
      />
    );
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(
      screen.queryByRole('radio', { name: /Progress/ })
    ).not.toBeInTheDocument();
  });
});
