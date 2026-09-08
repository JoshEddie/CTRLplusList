/* eslint-disable testing-library/no-node-access --
 * The owner composer's Visibility rows expose their label in a nested
 * `.menu-item-radio__label` span; the row's own accessible name concatenates
 * label and description, so the span query is the only path to the label
 * alone. */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookmarkStatus } from '@/lib/data/visit';
import { ListTable } from '@/lib/types';
import { VISIBILITY } from '@/lib/visibility';
import {
  HeroCollapsedOwnerItems,
  HeroCollapsedViewerItems,
} from '../HeroCollapsedItemsContainer';

vi.mock('@/lib/data/visit', () => ({
  getBookmarkStatus: vi.fn(),
}));

// The composed child factories reach the DB/network boundary via these
// modules; mocking them keeps the container unit test off the server graph.
vi.mock('@/lib/data/list.actions', () => ({
  setListVisibility: vi.fn(),
}));
vi.mock('@/lib/data/visit.actions', () => ({
  bookmarkList: vi.fn(),
  unbookmarkList: vi.fn(),
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

const VIEWER_ID = 'viewer-1';

const list: ListTable = {
  id: 'list-1',
  name: 'Birthday',
  subtitle: null,
  occasion: 'Birthday',
  date: new Date('2025-01-01'),
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
  profile_id: 'owner-profile-1',
  shared: true,
};

beforeEach(() => {
  vi.mocked(getBookmarkStatus).mockResolvedValue(false);
});

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
      screen.queryByRole('menuitem', { name: /Bookmark/ })
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

describe('HeroCollapsedViewerItems', () => {
  // Follow left this set with the hero button: it is reached inside the
  // profile card the byline row opens.
  it('Bookmarked_RendersShareAndBookmarkedSeededFromDal-NoFollow', async () => {
    vi.mocked(getBookmarkStatus).mockResolvedValue(true);
    render(
      await HeroCollapsedViewerItems({ list, viewerUserId: VIEWER_ID })
    );
    expect(
      screen.getByRole('menuitem', { name: 'Share List' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Bookmarked' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: /Follow/ })
    ).not.toBeInTheDocument();
  });

  it('NotBookmarked_RendersBookmarkRowForTheViewersOwnStatus', async () => {
    render(
      await HeroCollapsedViewerItems({ list, viewerUserId: VIEWER_ID })
    );
    expect(getBookmarkStatus).toHaveBeenCalledWith('list-1', VIEWER_ID);
    expect(
      screen.getByRole('menuitem', { name: 'Bookmark' })
    ).toBeInTheDocument();
  });
});
