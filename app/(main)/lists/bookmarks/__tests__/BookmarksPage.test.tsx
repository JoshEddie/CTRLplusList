import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth';
import { getUserIdByEmail } from '@/lib/data/user';
import { getBookmarkedListsByUser } from '@/lib/data/visit';
import BookmarksPage from '../BookmarksPage';
import { makeRow } from './test-helpers';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/user', () => ({ getUserIdByEmail: vi.fn() }));
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
  vi.mocked(auth).mockResolvedValue({
    user: { email: 'viewer@test.local' },
  } as never);
  vi.mocked(getUserIdByEmail).mockResolvedValue({ id: 'viewer' } as never);
  vi.mocked(getBookmarkedListsByUser).mockResolvedValue([] as never);
});

describe('BookmarksPage', () => {
  describe('AuthGuard', () => {
    it('NoSessionEmail_RedirectsToRootWithoutReadingBookmarks', async () => {
      vi.mocked(auth).mockResolvedValue({ user: {} } as never);
      await expect(BookmarksPage()).rejects.toThrow('REDIRECT:/');
      expect(redirectMock).toHaveBeenCalledWith('/');
      expect(getBookmarkedListsByUser).not.toHaveBeenCalled();
    });

    it('EmailResolvesToNoUser_RedirectsToRoot', async () => {
      vi.mocked(getUserIdByEmail).mockResolvedValue(null as never);
      await expect(BookmarksPage()).rejects.toThrow('REDIRECT:/');
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
