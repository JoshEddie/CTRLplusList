/* eslint-disable testing-library/no-node-access --
 * The Save menu item exposes its icon as an `aria-hidden` `<svg>` with no
 * accessible name, so a tag query is the only path to it.
 */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookmarkList, unbookmarkList } from '@/lib/data/visit.actions';
import toast from 'react-hot-toast';
import type { ActionResponse } from '@/lib/types';
import { deferred } from '@/test/helpers/deferred';
import BookmarkMenuItem from '../BookmarkMenuItem';
import { renderInMenu } from './test-helpers';

vi.mock('@/lib/data/visit.actions', () => ({
  bookmarkList: vi.fn(),
  unbookmarkList: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('BookmarkMenuItem', () => {
  it('NotBookmarked_RendersBookmarkLabel-IconSvg', () => {
    renderInMenu(
      <BookmarkMenuItem listId="list-1" initialBookmarked={false} />
    );
    const item = screen.getByRole('menuitem', { name: 'Save' });
    expect(item).toBeInTheDocument();
    expect(item.querySelector('svg')).not.toBeNull();
  });

  it('Bookmarked_RendersBookmarkedLabel', () => {
    renderInMenu(<BookmarkMenuItem listId="list-1" initialBookmarked={true} />);
    expect(screen.getByRole('menuitem', { name: 'Saved' })).toBeInTheDocument();
  });

  it('ClickFromNotBookmarked_OptimisticToggle-CallsBookmarkList-ToastsBookmarked', async () => {
    vi.mocked(bookmarkList).mockResolvedValue({ success: true, message: '' });
    const user = userEvent.setup();
    renderInMenu(
      <BookmarkMenuItem listId="list-1" initialBookmarked={false} />
    );
    await user.click(screen.getByRole('menuitem', { name: 'Save' }));
    expect(screen.getByRole('menuitem', { name: 'Saved' })).toBeInTheDocument();
    await waitFor(() => expect(bookmarkList).toHaveBeenCalledWith('list-1'));
    expect(toast.success).toHaveBeenCalledWith('Saved');
  });

  it('ClickFromBookmarked_CallsUnbookmarkList-ToastsBookmarkRemoved', async () => {
    vi.mocked(unbookmarkList).mockResolvedValue({ success: true, message: '' });
    const user = userEvent.setup();
    renderInMenu(<BookmarkMenuItem listId="list-1" initialBookmarked={true} />);
    await user.click(screen.getByRole('menuitem', { name: 'Saved' }));
    await waitFor(() => expect(unbookmarkList).toHaveBeenCalledWith('list-1'));
    expect(toast.success).toHaveBeenCalledWith('List unsaved');
  });

  it('ClickFailure_RevertsState-ToastsError', async () => {
    vi.mocked(bookmarkList).mockResolvedValue({
      success: false,
      message: 'Failed',
    });
    const user = userEvent.setup();
    renderInMenu(
      <BookmarkMenuItem listId="list-1" initialBookmarked={false} />
    );
    await user.click(screen.getByRole('menuitem', { name: 'Save' }));
    expect(
      await screen.findByRole('menuitem', { name: 'Save' })
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Failed');
  });

  it('WhilePending_SecondClickIsNoOp', async () => {
    const d = deferred<ActionResponse>();
    vi.mocked(bookmarkList).mockReturnValue(d.promise);
    const user = userEvent.setup();
    renderInMenu(
      <BookmarkMenuItem listId="list-1" initialBookmarked={false} />
    );
    await user.click(screen.getByRole('menuitem', { name: 'Save' }));
    await user.click(screen.getByRole('menuitem', { name: 'Saved' }));
    expect(bookmarkList).toHaveBeenCalledTimes(1);
    d.resolve({ success: true, message: '' });
  });
});
