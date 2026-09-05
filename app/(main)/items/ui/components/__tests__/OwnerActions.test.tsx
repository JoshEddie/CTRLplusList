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

  // Entry writes belong to edit mode: the card's menu carries no row for the
  // quantity or for removal, on the list page as on the library.
  it('Default_OffersOnlyEditAndArchive', async () => {
    const user = userEvent.setup();
    renderActions();
    await openKebab(user);
    expect(
      screen.getAllByRole('menuitem').map((el) => el.textContent)
    ).toEqual(['Edit', 'Archive']);
  });
});
