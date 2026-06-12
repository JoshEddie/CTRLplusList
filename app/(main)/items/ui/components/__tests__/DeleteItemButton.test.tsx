import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveItem, deleteItem } from '@/lib/data/item.actions';
import DeleteItemButton from '../DeleteItemButton';

vi.mock('@/lib/data/item.actions', () => ({
  deleteItem: vi.fn(),
  archiveItem: vi.fn(),
}));

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  default: {
    promise: <T,>(p: Promise<T>) => p,
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function dialog() {
  // ConfirmDialog renders into the same tree; scope confirm/tertiary lookups to
  // its content so the in-dialog "Delete" is not confused with the trigger.
  return within(
    document.querySelector('.confirm-dialog-content') as HTMLElement
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(deleteItem).mockResolvedValue({ success: true } as never);
  vi.mocked(archiveItem).mockResolvedValue({ success: true } as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function openDialog(
  props: Partial<React.ComponentProps<typeof DeleteItemButton>> = {}
) {
  const user = userEvent.setup();
  render(<DeleteItemButton id="i1" {...props} />);
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  return user;
}

describe('DeleteItemButton', () => {
  describe('ActiveItem', () => {
    it('Open_RendersThreeButtonDialogWithHistoryCopy', async () => {
      await openDialog({ archived: false });
      expect(screen.getByText('Delete this item?')).toBeInTheDocument();
      expect(
        screen.getByText(
          "Archive instead to keep its history. Deleting can't be undone."
        )
      ).toBeInTheDocument();
      expect(
        dialog().getByRole('button', { name: 'Archive instead' })
      ).toBeInTheDocument();
      expect(
        dialog().getByRole('button', { name: 'Cancel' })
      ).toBeInTheDocument();
      expect(
        dialog().getByRole('button', { name: 'Delete' })
      ).toBeInTheDocument();
    });

    it('ArchiveInsteadNoCallback_CallsArchiveItem-PushReturnTo-NoDelete', async () => {
      const user = await openDialog({ archived: false, returnTo: '/lists/l1' });
      await user.click(
        dialog().getByRole('button', { name: 'Archive instead' })
      );
      expect(archiveItem).toHaveBeenCalledWith('i1', true);
      expect(deleteItem).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith('/lists/l1')
      );
    });

    it('ArchiveInsteadWithCallback_CallsOnDeleted-Refresh', async () => {
      const onDeleted = vi.fn();
      const user = await openDialog({ archived: false, onDeleted });
      await user.click(
        dialog().getByRole('button', { name: 'Archive instead' })
      );
      await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
      expect(router.refresh).toHaveBeenCalledTimes(1);
      expect(router.push).not.toHaveBeenCalled();
    });

    it('ArchiveInsteadNoReturnTo_PushesItems', async () => {
      const user = await openDialog({ archived: false });
      await user.click(
        dialog().getByRole('button', { name: 'Archive instead' })
      );
      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/items'));
    });

    it('ArchiveFails_NoNavigation', async () => {
      vi.mocked(archiveItem).mockResolvedValue({ success: false } as never);
      const user = await openDialog({ archived: false });
      await user.click(
        dialog().getByRole('button', { name: 'Archive instead' })
      );
      await waitFor(() => expect(archiveItem).toHaveBeenCalled());
      expect(router.push).not.toHaveBeenCalled();
    });

    it('ArchiveThrows_LogsError-NoNavigation', async () => {
      vi.mocked(archiveItem).mockRejectedValue(new Error('boom'));
      const user = await openDialog({ archived: false });
      await user.click(
        dialog().getByRole('button', { name: 'Archive instead' })
      );
      await waitFor(() => expect(console.error).toHaveBeenCalled());
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('ArchivedItem', () => {
    it('Open_RendersTwoButtonDialogWithPermanentCopy', async () => {
      await openDialog({ archived: true });
      expect(
        screen.getByText('Delete this item permanently?')
      ).toBeInTheDocument();
      expect(
        screen.getByText("This erases its history. Can't be undone.")
      ).toBeInTheDocument();
      expect(
        dialog().queryByRole('button', { name: 'Archive instead' })
      ).not.toBeInTheDocument();
    });
  });

  describe('ConfirmDelete', () => {
    it('NoCallbackWithReturnTo_CallsDeleteItem-PushReturnTo', async () => {
      const user = await openDialog({ returnTo: '/lists/l1' });
      await user.click(dialog().getByRole('button', { name: 'Delete' }));
      expect(deleteItem).toHaveBeenCalledWith('i1');
      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith('/lists/l1')
      );
    });

    it('NoCallbackNoReturnTo_PushesItems', async () => {
      const user = await openDialog();
      await user.click(dialog().getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/items'));
    });

    it('WithCallback_CallsOnDeleted-Refresh', async () => {
      const onDeleted = vi.fn();
      const user = await openDialog({ onDeleted });
      await user.click(dialog().getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
      expect(router.refresh).toHaveBeenCalledTimes(1);
      expect(router.push).not.toHaveBeenCalled();
    });

    it('DeleteFails_NoNavigation', async () => {
      vi.mocked(deleteItem).mockResolvedValue({ success: false } as never);
      const user = await openDialog();
      await user.click(dialog().getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(deleteItem).toHaveBeenCalled());
      expect(router.push).not.toHaveBeenCalled();
    });

    it('DeleteThrows_LogsError-NoNavigation', async () => {
      vi.mocked(deleteItem).mockRejectedValue(new Error('boom'));
      const user = await openDialog();
      await user.click(dialog().getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(console.error).toHaveBeenCalled());
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  it('Cancel_ClosesDialog-NoAction', async () => {
    const user = await openDialog();
    await user.click(dialog().getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete this item?')).not.toBeInTheDocument();
    expect(deleteItem).not.toHaveBeenCalled();
    expect(archiveItem).not.toHaveBeenCalled();
  });
});
