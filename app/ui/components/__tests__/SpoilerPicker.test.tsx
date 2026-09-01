import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIBRARY_TIER_ROWS } from '../spoiler-tier-rows';
import SpoilerPicker from '../SpoilerPicker';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
const sp = vi.hoisted(() => ({
  value: new URLSearchParams() as URLSearchParams | null,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/lists/list-1',
  useSearchParams: () => sp.value,
}));

const trigger = () => screen.getByRole('button', { name: /^Spoilers:/ });
const row = (name: string) => screen.getByRole('menuitemradio', { name });

beforeEach(() => {
  vi.clearAllMocks();
  sp.value = new URLSearchParams();
});

describe('SpoilerPicker', () => {
  it('Closed_TileShowsCurrentTierAndNoMenu', () => {
    render(<SpoilerPicker tier="progress" baseline="surprise" />);
    expect(trigger()).toHaveAccessibleName(
      'Spoilers: Progress only. Click to change.'
    );
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('TriggerClick_OpensMenuWithCurrentTierChecked', async () => {
    const user = userEvent.setup();
    render(<SpoilerPicker tier="progress" baseline="surprise" />);
    await user.click(trigger());
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
    expect(row('Show overall progress')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('SelectOtherTier_ReplacesUrlAndClosesMenu', async () => {
    const user = userEvent.setup();
    sp.value = new URLSearchParams('page=2');
    render(<SpoilerPicker tier="surprise" baseline="surprise" />);
    await user.click(trigger());
    await user.click(row("Show what's claimed"));
    expect(router.replace).toHaveBeenCalledWith(
      '/lists/list-1?page=2&spoiler=claims'
    );
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('SelectCurrentTier_ClosesMenuWithoutNavigating', async () => {
    const user = userEvent.setup();
    render(<SpoilerPicker tier="claims" baseline="surprise" />);
    await user.click(trigger());
    await user.click(row("Show what's claimed"));
    expect(router.replace).not.toHaveBeenCalled();
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('SelectBaselineWithNoSearchParams_ReplacesWithBarePath', async () => {
    const user = userEvent.setup();
    sp.value = null;
    render(<SpoilerPicker tier="claims" baseline="surprise" />);
    await user.click(trigger());
    await user.click(row('Keep it a surprise'));
    expect(router.replace).toHaveBeenCalledWith('/lists/list-1');
  });

  it('Escape_ClosesMenu', async () => {
    const user = userEvent.setup();
    render(<SpoilerPicker tier="claims" baseline="surprise" />);
    await user.click(trigger());
    await user.keyboard('{Escape}');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('LibraryRows_OmitProgress', async () => {
    const user = userEvent.setup();
    render(
      <SpoilerPicker tier="claims" baseline="surprise" rows={LIBRARY_TIER_ROWS} />
    );
    await user.click(trigger());
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(2);
    expect(
      screen.queryByRole('menuitemradio', { name: 'Show overall progress' })
    ).not.toBeInTheDocument();
  });
});
