import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveItem, deleteItem } from '@/lib/data/item.actions';
import DeleteItemButton from '../DeleteItemButton';

vi.mock('@/lib/data/item.actions', () => ({
  deleteItem: vi.fn(),
  archiveItem: vi.fn(),
}));

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
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

const onDeleted = vi.fn();

async function openDialog(
  props: Partial<React.ComponentProps<typeof DeleteItemButton>> = {}
) {
  const user = userEvent.setup();
  render(
    <DeleteItemButton
      id="i1"
      disabled={false}
      onDeleted={onDeleted}
      {...props}
    />
  );
  await user.click(screen.getByRole('button', { name: 'Delete' }));
  return user;
}

describe('DeleteItemButton', () => {
  it('BelowTheOwnerFloor_RendersDisabledAndOpensNoDialog', async () => {
    const user = userEvent.setup();
    render(<DeleteItemButton id="item-1" disabled onDeleted={onDeleted} />);

    const trigger = screen.getByRole('button', { name: 'Delete' });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByText('Delete this item?')).not.toBeInTheDocument();
  });

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

    it('ArchiveInstead_CallsArchiveItem-OnDeleted-Refresh-NoDelete', async () => {
      const user = await openDialog({ archived: false });
      await user.click(
        dialog().getByRole('button', { name: 'Archive instead' })
      );
      expect(archiveItem).toHaveBeenCalledWith('i1', true);
      expect(deleteItem).not.toHaveBeenCalled();
      await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
      expect(router.refresh).toHaveBeenCalledTimes(1);
    });

    it('ArchiveFails_NoOnDeleted', async () => {
      vi.mocked(archiveItem).mockResolvedValue({ success: false } as never);
      const user = await openDialog({ archived: false });
      await user.click(
        dialog().getByRole('button', { name: 'Archive instead' })
      );
      await waitFor(() => expect(archiveItem).toHaveBeenCalled());
      expect(onDeleted).not.toHaveBeenCalled();
    });

    it('ArchiveThrows_LogsError-NoOnDeleted', async () => {
      vi.mocked(archiveItem).mockRejectedValue(new Error('boom'));
      const user = await openDialog({ archived: false });
      await user.click(
        dialog().getByRole('button', { name: 'Archive instead' })
      );
      await waitFor(() => expect(console.error).toHaveBeenCalled());
      expect(onDeleted).not.toHaveBeenCalled();
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
    it('Confirm_CallsDeleteItem-OnDeleted-Refresh', async () => {
      const user = await openDialog();
      await user.click(dialog().getByRole('button', { name: 'Delete' }));
      expect(deleteItem).toHaveBeenCalledWith('i1');
      await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
      expect(router.refresh).toHaveBeenCalledTimes(1);
    });

    it('DeleteFails_NoOnDeleted', async () => {
      vi.mocked(deleteItem).mockResolvedValue({ success: false } as never);
      const user = await openDialog();
      await user.click(dialog().getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(deleteItem).toHaveBeenCalled());
      expect(onDeleted).not.toHaveBeenCalled();
    });

    it('DeleteThrows_LogsError-NoOnDeleted', async () => {
      vi.mocked(deleteItem).mockRejectedValue(new Error('boom'));
      const user = await openDialog();
      await user.click(dialog().getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(console.error).toHaveBeenCalled());
      expect(onDeleted).not.toHaveBeenCalled();
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
