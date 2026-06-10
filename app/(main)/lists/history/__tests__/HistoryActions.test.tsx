import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearVisitHistory, removeVisit } from '@/lib/data/visit.actions';
import toast from 'react-hot-toast';
import { ClearHistoryButton, RemoveVisitButton } from '../HistoryActions';

vi.mock('@/lib/data/visit.actions', () => ({
  removeVisit: vi.fn(),
  clearVisitHistory: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
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
  vi.mocked(removeVisit).mockResolvedValue({ success: true } as never);
  vi.mocked(clearVisitHistory).mockResolvedValue({ success: true } as never);
});

describe('RemoveVisitButton', () => {
  it('Default_RendersEnabledRemoveButtonWithAriaLabel', () => {
    render(<RemoveVisitButton listId="l1" />);
    const button = screen.getByRole('button', { name: 'Remove from history' });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'false');
  });

  it('Click_CallsRemoveVisitWithListId', async () => {
    const user = userEvent.setup();
    render(<RemoveVisitButton listId="l1" />);
    await user.click(screen.getByRole('button'));
    expect(removeVisit).toHaveBeenCalledWith('l1');
  });

  it('RemoveSuccess_CallsRouterRefresh', async () => {
    const user = userEvent.setup();
    vi.mocked(removeVisit).mockResolvedValue({ success: true } as never);
    render(<RemoveVisitButton listId="l1" />);
    await user.click(screen.getByRole('button'));
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('RemoveFailure_CallsToastError', async () => {
    const user = userEvent.setup();
    vi.mocked(removeVisit).mockResolvedValue({
      success: false,
      message: 'boom',
    } as never);
    render(<RemoveVisitButton listId="l1" />);
    await user.click(screen.getByRole('button'));
    expect(toast.error).toHaveBeenCalledWith('boom');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('ClickWhilePending_IsNoOp', async () => {
    const user = userEvent.setup();
    const d = deferred<ActionResult>();
    vi.mocked(removeVisit).mockReturnValue(d.promise as never);
    render(<RemoveVisitButton listId="l1" />);
    const button = screen.getByRole('button');

    await user.click(button);
    await user.click(button);
    expect(removeVisit).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve({ success: true });
    });
  });
});

describe('ClearHistoryButton', () => {
  it('DefaultClosed_NoDialogRendered', () => {
    render(<ClearHistoryButton />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ClickClear_OpensConfirmDialog', async () => {
    const user = userEvent.setup();
    render(<ClearHistoryButton />);
    await user.click(screen.getByRole('button', { name: 'Clear history' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear non-bookmarked' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear all' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('ClearNonBookmarked_CallsClearVisitHistoryIncludeBookmarkedFalse', async () => {
    const user = userEvent.setup();
    render(<ClearHistoryButton />);
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    await user.click(
      screen.getByRole('button', { name: 'Clear non-bookmarked' })
    );
    expect(clearVisitHistory).toHaveBeenCalledWith({
      includeBookmarked: false,
    });
  });

  it('ClearAll_CallsClearVisitHistoryIncludeBookmarkedTrue', async () => {
    const user = userEvent.setup();
    render(<ClearHistoryButton />);
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(clearVisitHistory).toHaveBeenCalledWith({ includeBookmarked: true });
  });

  it('Cancel_ClosesDialogWithoutCallingAction', async () => {
    const user = userEvent.setup();
    render(<ClearHistoryButton />);
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(clearVisitHistory).not.toHaveBeenCalled();
  });

  it('ClearSuccess_ClosesModalCallsToastSuccessAndRouterRefresh', async () => {
    const user = userEvent.setup();
    vi.mocked(clearVisitHistory).mockResolvedValue({ success: true } as never);
    render(<ClearHistoryButton />);
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    await user.click(
      screen.getByRole('button', { name: 'Clear non-bookmarked' })
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('History cleared');
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('ClearFailure_CallsToastError', async () => {
    const user = userEvent.setup();
    vi.mocked(clearVisitHistory).mockResolvedValue({
      success: false,
      message: 'failed',
    } as never);
    render(<ClearHistoryButton />);
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(toast.error).toHaveBeenCalledWith('failed');
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('ClickWhilePending_IsNoOp', async () => {
    const user = userEvent.setup();
    const d = deferred<ActionResult>();
    vi.mocked(clearVisitHistory).mockReturnValue(d.promise as never);
    render(<ClearHistoryButton />);
    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    await user.click(
      screen.getByRole('button', { name: 'Clear non-bookmarked' })
    );
    // Action in flight, modal still open: a second clear is a no-op.
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(clearVisitHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve({ success: true });
    });
  });
});
