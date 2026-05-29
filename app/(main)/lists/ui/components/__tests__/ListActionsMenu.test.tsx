import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteList } from '@/app/actions/lists';
import { ListTable } from '@/lib/types';
import toast from 'react-hot-toast';
import ListActionsMenu from '../ListActionsMenu';

vi.mock('@/app/actions/lists', () => ({ deleteList: vi.fn() }));

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const list: ListTable = {
  id: 'list-1',
  name: 'Birthday',
  subtitle: null,
  occasion: 'Birthday',
  date: new Date('2025-01-01'),
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
  user_id: 'owner-1',
  shared: true,
};

type MenuOverrides = Partial<React.ComponentProps<typeof ListActionsMenu>>;

function renderMenu(overrides: MenuOverrides = {}) {
  return render(
    <ListActionsMenu
      list={list}
      showSpoilers={overrides.showSpoilers ?? false}
      previewMode={overrides.previewMode ?? false}
      spoilerHref="/lists/list-1?spoilers=1"
      previewHref="/lists/list-1?preview=1"
      exitPreviewHref="/lists/list-1"
      isOwner={overrides.isOwner}
      prependedItems={overrides.prependedItems as ReactNode}
    />
  );
}

const trigger = () => screen.getByRole('button', { name: 'List actions' });
const openMenu = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(trigger());

afterEach(() => {
  vi.clearAllMocks();
});

describe('ListActionsMenu', () => {
  describe('Trigger', () => {
    it('Default_RendersKebab-AriaLabelHaspopupExpandedFalse-OpensOnClick', async () => {
      const user = userEvent.setup();
      renderMenu();
      const kebab = trigger();
      expect(kebab).toHaveClass('menu-trigger');
      expect(kebab).toHaveAttribute('aria-haspopup', 'menu');
      expect(kebab).toHaveAttribute('aria-expanded', 'false');
      await openMenu(user);
      expect(kebab).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menu', { name: 'List actions' })).toBeInTheDocument();
    });
  });

  describe('Prepended', () => {
    it('Owner_RendersPrependedItemsBeforeChooseItems', async () => {
      const user = userEvent.setup();
      renderMenu({ prependedItems: <div data-testid="prepended" /> });
      await openMenu(user);
      const prepended = screen.getByTestId('prepended');
      const choose = screen.getByRole('menuitem', { name: 'Choose items' });
      expect(
        prepended.compareDocumentPosition(choose) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  describe('Owner', () => {
    it('NonPreview_RendersFullBaseMenuInOrder', async () => {
      const user = userEvent.setup();
      renderMenu({ showSpoilers: false, previewMode: false });
      await openMenu(user);
      const items = screen
        .getAllByRole('menuitem')
        .map((el) => el.textContent);
      expect(items).toEqual([
        'Choose items',
        'Edit list',
        'Show spoilers',
        'Preview as viewer',
        'Delete list',
      ]);
    });

    it('ShowSpoilersTrue_RendersHideSpoilers', async () => {
      const user = userEvent.setup();
      renderMenu({ showSpoilers: true });
      await openMenu(user);
      expect(
        screen.getByRole('menuitem', { name: 'Hide spoilers' })
      ).toBeInTheDocument();
    });

    it('ShowSpoilersFalse_RendersShowSpoilers', async () => {
      const user = userEvent.setup();
      renderMenu({ showSpoilers: false });
      await openMenu(user);
      expect(
        screen.getByRole('menuitem', { name: 'Show spoilers' })
      ).toBeInTheDocument();
    });

    it('PreviewModeFalse_RendersPreviewAsViewer', async () => {
      const user = userEvent.setup();
      renderMenu({ previewMode: false });
      await openMenu(user);
      expect(
        screen.getByRole('menuitem', { name: 'Preview as viewer' })
      ).toBeInTheDocument();
    });

    it('PreviewModeTrue_RendersExitPreview-SuppressesChooseEditDelete', async () => {
      const user = userEvent.setup();
      renderMenu({ previewMode: true });
      await openMenu(user);
      expect(
        screen.getByRole('menuitem', { name: 'Exit preview' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('menuitem', { name: /spoilers/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Choose items' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Edit list' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Delete list' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Viewer', () => {
    it('Default_SuppressesChooseItems', async () => {
      const user = userEvent.setup();
      renderMenu({ isOwner: false });
      await openMenu(user);
      expect(
        screen.queryByRole('menuitem', { name: 'Choose items' })
      ).not.toBeInTheDocument();
    });

    it('Default_SuppressesEditList', async () => {
      const user = userEvent.setup();
      renderMenu({ isOwner: false });
      await openMenu(user);
      expect(
        screen.queryByRole('menuitem', { name: 'Edit list' })
      ).not.toBeInTheDocument();
    });

    it('Default_SuppressesSpoilerToggle', async () => {
      const user = userEvent.setup();
      renderMenu({ isOwner: false, showSpoilers: false });
      await openMenu(user);
      expect(
        screen.queryByRole('menuitem', { name: /spoilers/ })
      ).not.toBeInTheDocument();
    });

    it('Default_SuppressesPreviewToggle', async () => {
      const user = userEvent.setup();
      renderMenu({ isOwner: false });
      await openMenu(user);
      expect(
        screen.queryByRole('menuitem', { name: /[Pp]review/ })
      ).not.toBeInTheDocument();
    });

    it('Default_SuppressesDeleteList', async () => {
      const user = userEvent.setup();
      renderMenu({ isOwner: false });
      await openMenu(user);
      expect(
        screen.queryByRole('menuitem', { name: 'Delete list' })
      ).not.toBeInTheDocument();
    });

    it('WithPrependedItems_RendersOnlyPrependedItems', async () => {
      const user = userEvent.setup();
      renderMenu({ isOwner: false, prependedItems: <div data-testid="prepended" /> });
      await openMenu(user);
      expect(screen.getByTestId('prepended')).toBeInTheDocument();
      expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
    });
  });

  describe('DeleteFlow', () => {
    const openDelete = async (user: ReturnType<typeof userEvent.setup>) => {
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Delete list' }));
    };

    it('ActivateDelete_OpensConfirmDialog', async () => {
      const user = userEvent.setup();
      renderMenu();
      await openDelete(user);
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    it('ConfirmSuccess_CallsDeleteList-PushesLists-ToastsSuccess', async () => {
      vi.mocked(deleteList).mockResolvedValue({ success: true, message: '' });
      const user = userEvent.setup();
      renderMenu();
      await openDelete(user);
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(deleteList).toHaveBeenCalledWith('list-1'));
      await waitFor(() => expect(router.push).toHaveBeenCalledWith('/lists'));
      expect(toast.success).toHaveBeenCalledWith('List deleted successfully');
    });

    it('ConfirmFailure_ToastsError-NoNavigate', async () => {
      vi.mocked(deleteList).mockResolvedValue({
        success: false,
        message: '',
        error: 'Boom',
      });
      const user = userEvent.setup();
      renderMenu();
      await openDelete(user);
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Boom'));
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('EditFlow', () => {
    const openEdit = async (user: ReturnType<typeof userEvent.setup>) => {
      await openMenu(user);
      await user.click(screen.getByRole('menuitem', { name: 'Edit list' }));
    };

    it('ActivateEdit_OpensListFormContainer', async () => {
      const user = userEvent.setup();
      renderMenu();
      await openEdit(user);
      expect(screen.getByText('Edit List')).toBeInTheDocument();
    });

    it('CloseEdit_UnmountsListFormContainer', async () => {
      const user = userEvent.setup();
      renderMenu();
      await openEdit(user);
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByText('Edit List')).not.toBeInTheDocument();
    });
  });
});
