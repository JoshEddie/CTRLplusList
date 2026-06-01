import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bookmarkList, unbookmarkList } from '@/app/actions/lists';
import toast from 'react-hot-toast';
import BookmarkButton from '../BookmarkButton';

vi.mock('@/app/actions/lists', () => ({
  bookmarkList: vi.fn(),
  unbookmarkList: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock('react-icons/fa', () => ({
  FaBookmark: () => <svg data-testid="fa-bookmark" />,
  FaRegBookmark: () => <svg data-testid="fa-reg-bookmark" />,
}));

type ActionResult = { success: boolean; message?: string };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(bookmarkList).mockResolvedValue({ success: true } as never);
  vi.mocked(unbookmarkList).mockResolvedValue({ success: true } as never);
});

describe('BookmarkButton', () => {
  it('InitialBookmarkedTrue_RendersPressedBookmarkedLabelFilledIcon', () => {
    render(<BookmarkButton listId="l1" initialBookmarked />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Bookmarked')).toBeInTheDocument();
    expect(screen.getByTestId('fa-bookmark')).toBeInTheDocument();
    expect(screen.queryByTestId('fa-reg-bookmark')).not.toBeInTheDocument();
  });

  it('InitialBookmarkedFalse_RendersUnpressedBookmarkLabelOutlineIcon', () => {
    render(<BookmarkButton listId="l1" initialBookmarked={false} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Bookmark')).toBeInTheDocument();
    expect(screen.getByTestId('fa-reg-bookmark')).toBeInTheDocument();
    expect(screen.queryByTestId('fa-bookmark')).not.toBeInTheDocument();
  });

  it('ClickWhenUnbookmarked_OptimisticallyFlipsToBookmarked-CallsBookmarkList', async () => {
    const user = userEvent.setup();
    const d = deferred<ActionResult>();
    vi.mocked(bookmarkList).mockReturnValue(d.promise as never);
    render(<BookmarkButton listId="l1" initialBookmarked={false} />);
    const button = screen.getByRole('button');

    await user.click(button);
    // Flipped while the action is still in flight (deferred unresolved).
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(bookmarkList).toHaveBeenCalledWith('l1');
    expect(unbookmarkList).not.toHaveBeenCalled();

    await act(async () => {
      d.resolve({ success: true });
    });
  });

  it('ClickWhenBookmarked_OptimisticallyFlipsToUnbookmarked-CallsUnbookmarkList', async () => {
    const user = userEvent.setup();
    const d = deferred<ActionResult>();
    vi.mocked(unbookmarkList).mockReturnValue(d.promise as never);
    render(<BookmarkButton listId="l1" initialBookmarked />);
    const button = screen.getByRole('button');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(unbookmarkList).toHaveBeenCalledWith('l1');
    expect(bookmarkList).not.toHaveBeenCalled();

    await act(async () => {
      d.resolve({ success: true });
    });
  });

  it('ActionSuccess_PersistsStateAndCallsRouterRefresh', async () => {
    const user = userEvent.setup();
    vi.mocked(bookmarkList).mockResolvedValue({ success: true } as never);
    render(<BookmarkButton listId="l1" initialBookmarked={false} />);
    const button = screen.getByRole('button');

    await user.click(button);
    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(toast.success).toHaveBeenCalledWith('Bookmarked');
  });

  it('ActionFailure_RollsBackOptimisticState-CallsToastError', async () => {
    const user = userEvent.setup();
    vi.mocked(bookmarkList).mockResolvedValue({
      success: false,
      message: 'nope',
    } as never);
    render(<BookmarkButton listId="l1" initialBookmarked={false} />);
    const button = screen.getByRole('button');

    await user.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(toast.error).toHaveBeenCalledWith('nope');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('ClickWhilePending_IsNoOp', async () => {
    const user = userEvent.setup();
    const d = deferred<ActionResult>();
    vi.mocked(bookmarkList).mockReturnValue(d.promise as never);
    render(<BookmarkButton listId="l1" initialBookmarked={false} />);
    const button = screen.getByRole('button');

    await user.click(button);
    await user.click(button);
    expect(bookmarkList).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve({ success: true });
    });
  });
});
