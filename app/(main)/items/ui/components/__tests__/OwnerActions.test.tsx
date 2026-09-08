import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveItem } from '@/lib/data/item.actions';
import OwnerActions from '../OwnerActions';

vi.mock('@/lib/data/item.actions', () => ({ archiveItem: vi.fn() }));

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

  // The item library names no list, so nothing that would edit one is offered.
  it('OffList_OffersOnlyEditAndArchive-NoSeparator', async () => {
    const user = userEvent.setup();
    renderActions();
    await openKebab(user);
    expect(screen.getAllByRole('menuitem').map((el) => el.textContent)).toEqual(
      ['Edit item details', 'Archive']
    );
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  describe('OnList', () => {
    const move = vi.fn();
    const remove = vi.fn();
    const onList = {
      showArchiveAction: false,
      entry: { ends: { first: 'first', last: 'last' }, move, remove },
    };

    it('Middle_OffersMoveTopMoveBottomRemoveThenEdit', async () => {
      const user = userEvent.setup();
      renderActions(onList);
      await openKebab(user);
      expect(
        screen.getAllByRole('menuitem').map((el) => el.textContent)
      ).toEqual([
        'Move to top',
        'Move to bottom',
        'Remove from list',
        'Edit item details',
      ]);
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('FirstInListOrder_OmitsMoveToTop', async () => {
      const user = userEvent.setup();
      renderActions({ ...onList, itemId: 'first' });
      await openKebab(user);
      expect(
        screen.queryByRole('menuitem', { name: 'Move to top' })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: 'Move to bottom' })
      ).toBeInTheDocument();
    });

    it('LastInListOrder_OmitsMoveToBottom', async () => {
      const user = userEvent.setup();
      renderActions({ ...onList, itemId: 'last' });
      await openKebab(user);
      expect(
        screen.queryByRole('menuitem', { name: 'Move to bottom' })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: 'Move to top' })
      ).toBeInTheDocument();
    });

    // A non-list-order sort withholds the ends, so the moves that would
    // silently rewrite the order the owner sorted by are not offered.
    it('NoListEnds_OmitsBothMoveRows-KeepsRemove', async () => {
      const user = userEvent.setup();
      renderActions({ ...onList, entry: { move, remove } });
      await openKebab(user);
      expect(
        screen.getAllByRole('menuitem').map((el) => el.textContent)
      ).toEqual(['Remove from list', 'Edit item details']);
    });

    it('MoveToTop_CallsOnMoveWithFirstId-ClosesMenu', async () => {
      const user = userEvent.setup();
      renderActions(onList);
      await openKebab(user);
      await user.click(screen.getByRole('menuitem', { name: 'Move to top' }));
      expect(move).toHaveBeenCalledWith('first');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('MoveToBottom_CallsOnMoveWithLastId', async () => {
      const user = userEvent.setup();
      renderActions(onList);
      await openKebab(user);
      await user.click(screen.getByRole('menuitem', { name: 'Move to bottom' }));
      expect(move).toHaveBeenCalledWith('last');
    });

    it('Remove_CallsOnRemove-ClosesMenu', async () => {
      const user = userEvent.setup();
      renderActions(onList);
      await openKebab(user);
      await user.click(
        screen.getByRole('menuitem', { name: 'Remove from list' })
      );
      expect(remove).toHaveBeenCalled();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });
});
