/* eslint-disable testing-library/no-node-access --
 * The owner composer's Visibility rows expose their label in a nested
 * `.menu-item-radio__label` span; the row's own accessible name concatenates
 * label and description, so the span query is the only path to the label
 * alone. */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBookmarkStatus } from '@/lib/data/visit';
import { VISIBILITY } from '@/lib/visibility';
import HeroCollapsedOwnerItems from '../HeroCollapsedOwnerItems';
import { makeList } from './test-helpers';

vi.mock('@/lib/data/visit', () => ({
  getBookmarkStatus: vi.fn(),
}));

// The composed child factories reach the DB/network boundary via these
// modules; mocking them keeps the container unit test off the server graph.
vi.mock('@/lib/data/list.actions', () => ({
  setListVisibility: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((p: Promise<unknown>) => p),
  },
}));

const list = makeList();

afterEach(() => {
  vi.clearAllMocks();
});

const radioLabels = () =>
  screen
    .getAllByRole('menuitemradio')
    .map((el) => el.querySelector('.menu-item-radio__label')?.textContent);

describe('HeroCollapsedOwnerItems', () => {
  it('Default_RendersShareThenVisibilitySeededFromProp-NoBookmark', async () => {
    render(
      await HeroCollapsedOwnerItems({
        list,
        visibility: VISIBILITY.LINK,
        disabled: false,
      })
    );
    expect(
      screen.getByRole('menuitem', { name: 'Share List' })
    ).toBeInTheDocument();
    expect(radioLabels()).toEqual(['Hidden', 'Private', 'Shared']);
    expect(
      screen.getByRole('menuitemradio', { name: /^Private/ })
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.queryByRole('menuitem', { name: /Save/ })
    ).not.toBeInTheDocument();
  });

  it('Default_PerformsNoDalReads', async () => {
    await HeroCollapsedOwnerItems({
      list,
      visibility: VISIBILITY.OWNER,
      disabled: false,
    });
    expect(getBookmarkStatus).not.toHaveBeenCalled();
  });
});
