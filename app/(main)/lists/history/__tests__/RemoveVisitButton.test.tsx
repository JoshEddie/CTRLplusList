import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { removeVisit } from '@/lib/data/visit.actions';
import toast from 'react-hot-toast';
import RemoveVisitButton from '../RemoveVisitButton';
import { deferred, type ActionResult } from '@/test/helpers/deferred';

vi.mock('@/lib/data/visit.actions', () => ({
  removeVisit: vi.fn(),
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
  vi.mocked(removeVisit).mockResolvedValue({ success: true } as never);
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
