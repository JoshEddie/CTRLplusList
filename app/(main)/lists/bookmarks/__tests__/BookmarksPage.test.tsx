import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBookmarkedListsByUser } from '@/lib/data/visit';
import { authedUserId } from '@/lib/data/user.session';
import BookmarksPage from '../BookmarksPage';
import { makeRow } from './test-helpers';

vi.mock('@/lib/data/user.session', () => ({ authedUserId: vi.fn() }));
vi.mock('@/lib/data/visit', () => ({ getBookmarkedListsByUser: vi.fn() }));

const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  })
);
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

vi.mock('@/app/ui/components/ListCollectionsNav', () => ({
  default: () => <div data-testid="list-collections-nav" />,
}));
vi.mock('@/app/ui/components/ListCard', () => ({
  default: (props: { showOwner?: boolean }) => (
    <div data-testid="list-card" data-show-owner={String(props.showOwner)} />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authedUserId).mockResolvedValue('viewer');
  vi.mocked(getBookmarkedListsByUser).mockResolvedValue([] as never);
});

describe('BookmarksPage', () => {
  describe('AuthGuard', () => {
    it('UnresolvedViewer_RedirectsToRootWithoutReadingBookmarks', async () => {
      vi.mocked(authedUserId).mockResolvedValue(null);
      await expect(BookmarksPage()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getBookmarkedListsByUser).not.toHaveBeenCalled();
    });
  });

  describe('Render', () => {
    it('ViewerResolved_ReadsBookmarksForViewerId', async () => {
      await BookmarksPage();
      expect(getBookmarkedListsByUser).toHaveBeenCalledWith('viewer');
    });

    it('Populated_RendersNavAndOneCardPerRow', async () => {
      vi.mocked(getBookmarkedListsByUser).mockResolvedValue([
        makeRow({ list_id: 'l1' }),
        makeRow({ list_id: 'l2' }),
      ] as never);
      render(await BookmarksPage());
      expect(screen.getByTestId('list-collections-nav')).toBeInTheDocument();
      expect(screen.getAllByTestId('list-card')).toHaveLength(2);
    });

    it('NoBookmarks_RendersEmptyMessagePassThrough', async () => {
      render(await BookmarksPage());
      expect(screen.getByText(/No bookmarks yet/i)).toBeInTheDocument();
      expect(screen.queryByTestId('list-card')).not.toBeInTheDocument();
    });
  });
});
