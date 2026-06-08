import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteList } from '@/app/actions/lists';
import toast from 'react-hot-toast';
import DeleteListButton from '../DeleteListButton';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }));

vi.mock('@/app/actions/lists', () => ({ deleteList: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function openDialog(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole('button', { name: 'Delete' }));
}
// Once the dialog is open there are two "Delete" buttons (the trigger and the
// dialog's confirm); the confirm renders after the trigger in DOM order.
function confirmButton() {
  return screen.getAllByRole('button', { name: 'Delete' })[1];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeleteListButton', () => {
  it('Default_DialogClosed', () => {
    render(<DeleteListButton id="list-9" />);
    expect(
      screen.queryByText('Confirm Delete')
    ).not.toBeInTheDocument();
  });

  it('ClickDelete_OpensConfirmDialog', async () => {
    const user = userEvent.setup();
    render(<DeleteListButton id="list-9" />);
    await openDialog(user);
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
  });

  it('Confirm_CallsDeleteList-ToastSuccess-NavigatesToLists', async () => {
    vi.mocked(deleteList).mockResolvedValue({ success: true } as never);
    const user = userEvent.setup();
    render(<DeleteListButton id="list-9" />);
    await openDialog(user);
    await user.click(confirmButton());

    await waitFor(() => expect(deleteList).toHaveBeenCalledWith('list-9'));
    expect(toast.success).toHaveBeenCalledWith('List deleted successfully');
    expect(router.push).toHaveBeenCalledWith('/lists');
  });

  it('ConfirmFailure_ToastsError-NoNavigation', async () => {
    vi.mocked(deleteList).mockResolvedValue({
      success: false,
      error: 'List has claimed items',
    } as never);
    const user = userEvent.setup();
    render(<DeleteListButton id="list-9" />);
    await openDialog(user);
    await user.click(confirmButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('List has claimed items')
    );
    expect(router.push).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('ConfirmFailureNoError_ToastsGenericError-NoNavigation', async () => {
    vi.mocked(deleteList).mockResolvedValue({ success: false } as never);
    const user = userEvent.setup();
    render(<DeleteListButton id="list-9" />);
    await openDialog(user);
    await user.click(confirmButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to delete list')
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('Cancel_ClosesDialog-NoDeleteListCall', async () => {
    const user = userEvent.setup();
    render(<DeleteListButton id="list-9" />);
    await openDialog(user);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    expect(deleteList).not.toHaveBeenCalled();
  });
});
