import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearVisitHistory } from '@/lib/data/visit.actions';
import toast from 'react-hot-toast';
import ClearHistoryButton from '../ClearHistoryButton';
import { deferred, type ActionResult } from '@/test/helpers/deferred';

vi.mock('@/lib/data/visit.actions', () => ({
  clearVisitHistory: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));
const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clearVisitHistory).mockResolvedValue({ success: true } as never);
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
      screen.getByRole('button', { name: 'Clear unsaved' })
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
      screen.getByRole('button', { name: 'Clear unsaved' })
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
      screen.getByRole('button', { name: 'Clear unsaved' })
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
      screen.getByRole('button', { name: 'Clear unsaved' })
    );
    // Action in flight, modal still open: a second clear is a no-op.
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(clearVisitHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve({ success: true });
    });
  });
});
