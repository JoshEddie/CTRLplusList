import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveItem } from '@/lib/data/item.actions';
import {
  removeListItem,
  setListItemQuantity,
} from '@/lib/data/listItems.actions';
import OwnerActions from '../OwnerActions';

vi.mock('@/lib/data/item.actions', () => ({ archiveItem: vi.fn() }));
vi.mock('@/lib/data/listItems.actions', () => ({
  removeListItem: vi.fn(),
  setListItemQuantity: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    promise: <T,>(p: Promise<T>) => p,
  },
}));

function renderActions(
  overrides: Partial<React.ComponentProps<typeof OwnerActions>> = {}
) {
  const props: React.ComponentProps<typeof OwnerActions> = {
    itemId: 'i1',
    showArchiveAction: true,
    archivedView: false,
    pathname: '/lists/l1',
    searchParams: new URLSearchParams('q=x') as never,
    onChanged: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<OwnerActions {...props} />) };
}

async function openKebab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Item actions' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(archiveItem).mockResolvedValue({ success: true } as never);
  vi.mocked(removeListItem).mockResolvedValue({ success: true } as never);
  vi.mocked(setListItemQuantity).mockResolvedValue({ success: true } as never);
});

afterEach(() => vi.restoreAllMocks());

describe('OwnerActions', () => {
  it('Render_ShowsOnlyKebabTrigger-NoInlineIcons', () => {
    renderActions();
    expect(
      screen.getByRole('button', { name: 'Item actions' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Archive item' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Edit item' })
    ).not.toBeInTheDocument();
  });

  it('NoArchiveAction_OmitsArchiveMenuEntry', async () => {
    const user = userEvent.setup();
    renderActions({ showArchiveAction: false });
    await openKebab(user);
    expect(
      screen.queryByRole('menuitem', { name: 'Archive' })
    ).not.toBeInTheDocument();
  });

  it('Kebab_OpensMenuWithReturnToEditLink-ArchiveDispatches', async () => {
    const user = userEvent.setup();
    const { props } = renderActions();
    await openKebab(user);
    expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/items/i1?returnTo=')
    );
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(archiveItem).toHaveBeenCalledWith('i1', true);
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it('ArchiveFails_DoesNotNotify', async () => {
    vi.mocked(archiveItem).mockResolvedValue({ success: false } as never);
    const user = userEvent.setup();
    const { props } = renderActions();
    await openKebab(user);
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }));
    await waitFor(() => expect(archiveItem).toHaveBeenCalled());
    expect(props.onChanged).not.toHaveBeenCalled();
  });

  it('KebabEdit_ClosesMenu', async () => {
    const user = userEvent.setup();
    renderActions();
    await openKebab(user);
    await user.click(screen.getByRole('menuitem', { name: /Edit/ }));
    expect(
      screen.queryByRole('menuitem', { name: 'Archive' })
    ).not.toBeInTheDocument();
  });

  it('ArchivedViewKebab_ShowsUnarchiveEntry-DispatchesArchiveFalse', async () => {
    const user = userEvent.setup();
    renderActions({ archivedView: true });
    await openKebab(user);
    await user.click(screen.getByRole('menuitem', { name: 'Unarchive' }));
    expect(archiveItem).toHaveBeenCalledWith('i1', false);
  });

  it('KebabEscape_ClosesMenu', async () => {
    const user = userEvent.setup();
    renderActions();
    await openKebab(user);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('NoSearchParams_BuildsEditLinkWithoutQuery', async () => {
    const user = userEvent.setup();
    renderActions({ searchParams: null });
    await openKebab(user);
    expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveAttribute(
      'href',
      `/items/i1?returnTo=${encodeURIComponent('/lists/l1')}`
    );
  });

  describe('RemoveFromList', () => {
    it('NoListId_OmitsRemoveEntry', async () => {
      const user = userEvent.setup();
      renderActions();
      await openKebab(user);
      expect(
        screen.queryByRole('menuitem', { name: 'Remove from list' })
      ).not.toBeInTheDocument();
    });

    it('ListId_MenuOrdersEditArchiveQuantityRemove-RemoveHasDangerTone', async () => {
      const user = userEvent.setup();
      renderActions({ listId: 'l1' });
      await openKebab(user);
      const entries = screen
        .getAllByRole('menuitem')
        .map((el) => el.textContent);
      expect(entries).toEqual([
        'Edit',
        'Archive',
        'Quantity',
        'Remove from list',
      ]);
      expect(
        screen.getByRole('menuitem', { name: 'Remove from list' }).className
      ).toContain('danger');
    });

    it('ClickRemove_ClosesMenu-OpensConfirmDialogWithLibraryCopy', async () => {
      const user = userEvent.setup();
      renderActions({ listId: 'l1' });
      await openKebab(user);
      await user.click(
        screen.getByRole('menuitem', { name: 'Remove from list' })
      );
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.getByText('Remove from this list?')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The item only comes off this list — it stays in your item library.'
        )
      ).toBeInTheDocument();
      expect(removeListItem).not.toHaveBeenCalled();
    });

    it('ConfirmRemove_CallsRemoveListItem-NotifiesOnSuccess-ClosesDialog', async () => {
      const user = userEvent.setup();
      const { props } = renderActions({ listId: 'l1' });
      await openKebab(user);
      await user.click(
        screen.getByRole('menuitem', { name: 'Remove from list' })
      );
      await user.click(screen.getByRole('button', { name: 'Remove' }));
      expect(removeListItem).toHaveBeenCalledWith('l1', 'i1');
      await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
      expect(
        screen.queryByText('Remove from this list?')
      ).not.toBeInTheDocument();
    });

    it('CancelRemove_ClosesDialog-NoActionCall', async () => {
      const user = userEvent.setup();
      const { props } = renderActions({ listId: 'l1' });
      await openKebab(user);
      await user.click(
        screen.getByRole('menuitem', { name: 'Remove from list' })
      );
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(
        screen.queryByText('Remove from this list?')
      ).not.toBeInTheDocument();
      expect(removeListItem).not.toHaveBeenCalled();
      expect(props.onChanged).not.toHaveBeenCalled();
    });

    it('RemoveFails_DoesNotNotify', async () => {
      vi.mocked(removeListItem).mockResolvedValue({ success: false } as never);
      const user = userEvent.setup();
      const { props } = renderActions({ listId: 'l1' });
      await openKebab(user);
      await user.click(
        screen.getByRole('menuitem', { name: 'Remove from list' })
      );
      await user.click(screen.getByRole('button', { name: 'Remove' }));
      await waitFor(() => expect(removeListItem).toHaveBeenCalled());
      expect(props.onChanged).not.toHaveBeenCalled();
    });
  });

  describe('Quantity', () => {
    const openDialog = async (
      user: ReturnType<typeof userEvent.setup>,
      quantity = 1
    ) => {
      const view = renderActions({ listId: 'l1', quantity });
      await openKebab(user);
      await user.click(screen.getByRole('menuitem', { name: 'Quantity' }));
      return view;
    };

    it('NoListId_OmitsQuantityEntry', async () => {
      const user = userEvent.setup();
      renderActions();
      await openKebab(user);
      expect(
        screen.queryByRole('menuitem', { name: 'Quantity' })
      ).not.toBeInTheDocument();
    });

    // The library row carries no entry and so no quantity; the field opens on
    // the number a new entry gets.
    it('NoQuantity_DialogOpensAtOne', async () => {
      const user = userEvent.setup();
      renderActions({ listId: 'l1' });
      await openKebab(user);
      await user.click(screen.getByRole('menuitem', { name: 'Quantity' }));
      expect(screen.getByRole('spinbutton')).toHaveValue(1);
    });

    it('ClickQuantity_ClosesMenu-OpensDialogSeededWithCurrentQuantity', async () => {
      const user = userEvent.setup();
      await openDialog(user, 4);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(screen.getByRole('spinbutton')).toHaveValue(4);
      expect(setListItemQuantity).not.toHaveBeenCalled();
    });

    it('SaveNewValue_CallsSetListItemQuantity-Notifies-ClosesDialog', async () => {
      const user = userEvent.setup();
      const { props } = await openDialog(user, 1);
      await user.clear(screen.getByRole('spinbutton'));
      await user.type(screen.getByRole('spinbutton'), '4');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(setListItemQuantity).toHaveBeenCalledWith('l1', 'i1', 4);
      await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
      expect(
        screen.queryByRole('button', { name: 'Save' })
      ).not.toBeInTheDocument();
    });

    it('SaveFails_DoesNotNotify', async () => {
      vi.mocked(setListItemQuantity).mockResolvedValue({
        success: false,
      } as never);
      const user = userEvent.setup();
      const { props } = await openDialog(user, 2);
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(setListItemQuantity).toHaveBeenCalled());
      expect(props.onChanged).not.toHaveBeenCalled();
    });

    it('Cancel_ClosesDialog-NoActionCall', async () => {
      const user = userEvent.setup();
      const { props } = await openDialog(user, 2);
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(
        screen.queryByRole('button', { name: 'Save' })
      ).not.toBeInTheDocument();
      expect(setListItemQuantity).not.toHaveBeenCalled();
      expect(props.onChanged).not.toHaveBeenCalled();
    });

    // The control admits no number the action would refuse, so there is no
    // rejected value to disable Save over — out-of-range input lands on the
    // nearest legal one instead.
    describe('OutOfRangeValues', () => {
      it.each([
        ['0', 1],
        ['1.5', 1],
        ['1000', 99],
        ['', 1],
      ])('Value%s_SavesTheNearestLegalQuantity', async (typed, saved) => {
        const user = userEvent.setup();
        await openDialog(user, 2);
        const field = screen.getByRole('spinbutton');
        await user.clear(field);
        if (typed) await user.type(field, typed);
        await user.click(screen.getByRole('button', { name: 'Save' }));
        expect(setListItemQuantity).toHaveBeenCalledWith('l1', 'i1', saved);
      });
    });
  });
});
