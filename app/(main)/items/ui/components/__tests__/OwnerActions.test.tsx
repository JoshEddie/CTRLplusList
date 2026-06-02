import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveItem } from '@/app/actions/items';
import OwnerActions from '../OwnerActions';

vi.mock('@/app/actions/items', () => ({ archiveItem: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  default: {
    promise: <T,>(p: Promise<T>) => p,
  },
}));

vi.mock('../EditItemButton', () => ({
  default: (p: { itemId: string }) => (
    <button type="button" data-testid="edit-btn" data-item-id={p.itemId} />
  ),
}));

function renderActions(
  overrides: Partial<React.ComponentProps<typeof OwnerActions>> = {}
) {
  const props: React.ComponentProps<typeof OwnerActions> = {
    itemId: 'i1',
    user_id: 'owner',
    showArchiveAction: true,
    archivedView: false,
    pathname: '/lists/l1',
    searchParams: new URLSearchParams('q=x') as never,
    onArchived: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<OwnerActions {...props} />) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(archiveItem).mockResolvedValue({ success: true } as never);
});

afterEach(() => vi.restoreAllMocks());

describe('OwnerActions', () => {
  it('DesktopArchive_CallsArchiveTrue-NotifiesOnSuccess', async () => {
    const user = userEvent.setup();
    const { props } = renderActions();
    await user.click(screen.getByRole('button', { name: 'Archive item' }));
    expect(archiveItem).toHaveBeenCalledWith('i1', true);
    await waitFor(() => expect(props.onArchived).toHaveBeenCalled());
  });

  it('ArchivedView_DesktopUnarchiveCallsArchiveFalse', async () => {
    const user = userEvent.setup();
    renderActions({ archivedView: true });
    await user.click(screen.getByRole('button', { name: 'Unarchive item' }));
    expect(archiveItem).toHaveBeenCalledWith('i1', false);
  });

  it('ArchiveFails_DoesNotNotify', async () => {
    vi.mocked(archiveItem).mockResolvedValue({ success: false } as never);
    const user = userEvent.setup();
    const { props } = renderActions();
    await user.click(screen.getByRole('button', { name: 'Archive item' }));
    await waitFor(() => expect(archiveItem).toHaveBeenCalled());
    expect(props.onArchived).not.toHaveBeenCalled();
  });

  it('NoArchiveAction_OmitsArchiveButtonAndMenuEntry', async () => {
    const user = userEvent.setup();
    renderActions({ showArchiveAction: false });
    expect(
      screen.queryByRole('button', { name: 'Archive item' })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Item actions' }));
    expect(
      screen.queryByRole('menuitem', { name: 'Archive' })
    ).not.toBeInTheDocument();
  });

  it('NoUserId_OmitsEditButton', () => {
    renderActions({ user_id: undefined });
    expect(screen.queryByTestId('edit-btn')).not.toBeInTheDocument();
  });

  it('UserId_RendersEditButton', () => {
    renderActions();
    expect(screen.getByTestId('edit-btn')).toHaveAttribute('data-item-id', 'i1');
  });

  it('Kebab_OpensMenuWithReturnToEditLink-ArchiveDispatches', async () => {
    const user = userEvent.setup();
    renderActions();
    await user.click(screen.getByRole('button', { name: 'Item actions' }));
    expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/items/i1?returnTo=')
    );
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(archiveItem).toHaveBeenCalledWith('i1', true);
  });

  it('KebabEdit_ClosesMenu', async () => {
    const user = userEvent.setup();
    renderActions();
    await user.click(screen.getByRole('button', { name: 'Item actions' }));
    await user.click(screen.getByRole('menuitem', { name: /Edit/ }));
    expect(
      screen.queryByRole('menuitem', { name: 'Archive' })
    ).not.toBeInTheDocument();
  });

  it('ArchivedViewKebab_ShowsUnarchiveEntry', async () => {
    const user = userEvent.setup();
    renderActions({ archivedView: true });
    await user.click(screen.getByRole('button', { name: 'Item actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Unarchive' }));
    expect(archiveItem).toHaveBeenCalledWith('i1', false);
  });

  it('KebabEscape_ClosesMenu', async () => {
    const user = userEvent.setup();
    renderActions();
    await user.click(screen.getByRole('button', { name: 'Item actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('NoSearchParams_BuildsEditLinkWithoutQuery', async () => {
    const user = userEvent.setup();
    renderActions({ searchParams: null });
    await user.click(screen.getByRole('button', { name: 'Item actions' }));
    expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveAttribute(
      'href',
      `/items/i1?returnTo=${encodeURIComponent('/lists/l1')}`
    );
  });
});
