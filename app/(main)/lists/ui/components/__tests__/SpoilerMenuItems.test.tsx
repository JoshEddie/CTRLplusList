import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SpoilerMenuItems from '../SpoilerMenuItems';
import { renderInMenu } from './test-helpers';

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
const sp = vi.hoisted(() => ({
  value: new URLSearchParams() as URLSearchParams | null,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/lists/list-1',
  useSearchParams: () => sp.value,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('SpoilerMenuItems', () => {
  const row = (name: string) => screen.getByRole('menuitemradio', { name });

  beforeEach(() => {
    sp.value = new URLSearchParams();
  });

  it('Default_RendersThreeRowsWithCurrentTierChecked', () => {
    renderInMenu(<SpoilerMenuItems tier="claims" baseline="surprise" />);
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(3);
    expect(row("Show what's claimed")).toHaveAttribute('aria-checked', 'true');
    expect(row('Keep it a surprise')).toHaveAttribute('aria-checked', 'false');
  });

  it('SelectOtherTier_ReplacesUrlKeepingExistingParams', async () => {
    const user = userEvent.setup();
    sp.value = new URLSearchParams('page=2');
    renderInMenu(<SpoilerMenuItems tier="surprise" baseline="surprise" />);
    await user.click(row("Show what's claimed"));
    expect(router.replace).toHaveBeenCalledWith(
      '/lists/list-1?page=2&spoiler=claims',
      { scroll: false }
    );
  });

  it('SelectCurrentTier_DoesNotNavigate', async () => {
    const user = userEvent.setup();
    renderInMenu(<SpoilerMenuItems tier="claims" baseline="surprise" />);
    await user.click(row("Show what's claimed"));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('SelectBaselineWithNoSearchParams_ReplacesWithBarePath', async () => {
    const user = userEvent.setup();
    sp.value = null;
    renderInMenu(<SpoilerMenuItems tier="claims" baseline="surprise" />);
    await user.click(row('Keep it a surprise'));
    expect(router.replace).toHaveBeenCalledWith('/lists/list-1', {
      scroll: false,
    });
  });
});
