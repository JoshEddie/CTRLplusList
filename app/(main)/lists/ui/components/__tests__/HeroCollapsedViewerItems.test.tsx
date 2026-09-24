import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookmarkStatus } from '@/lib/data/visit';
import HeroCollapsedViewerItems from '../HeroCollapsedViewerItems';
import { makeList } from './test-helpers';

vi.mock('@/lib/data/visit', () => ({
  getBookmarkStatus: vi.fn(),
}));

// The composed child factories reach the DB/network boundary via these
// modules; mocking them keeps the container unit test off the server graph.
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
const list = makeList();

beforeEach(() => {
  vi.mocked(getBookmarkStatus).mockResolvedValue(false);
});

afterEach(() => {
  vi.clearAllMocks();
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
      screen.getByRole('menuitem', { name: 'Saved' })
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
      screen.getByRole('menuitem', { name: 'Save' })
    ).toBeInTheDocument();
  });
});
