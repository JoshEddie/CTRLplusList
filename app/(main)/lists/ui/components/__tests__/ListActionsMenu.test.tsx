import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListTable } from '@/lib/types';
import ListActionsMenu from '../ListActionsMenu';

vi.mock('../ListFormContainer', async () => ({
  default: (await import('./list-form-stub')).ListFormContainerStub,
}));

const list: ListTable = {
  id: 'list-1',
  name: 'Birthday',
  subtitle: null,
  occasion: 'Birthday',
  date: new Date('2025-01-01'),
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
  profile_id: 'owner-profile-1',
  shared: true,
};

type MenuOverrides = Partial<React.ComponentProps<typeof ListActionsMenu>>;

function renderMenu(overrides: MenuOverrides = {}, meetsOwnerFloor = true) {
  return render(
    <ListActionsMenu
      list={list}
      isOwner={overrides.isOwner}
      prependedItems={overrides.prependedItems as ReactNode}
      deleteDisabled={!meetsOwnerFloor}
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
      expect(
        screen.getByRole('menu', { name: 'List actions' })
      ).toBeInTheDocument();
    });
  });

  describe('Prepended', () => {
    it('Owner_RendersPrependedItemsBeforeTheBaseMenu', async () => {
      const user = userEvent.setup();
      renderMenu({ prependedItems: <div data-testid="prepended" /> });
      await openMenu(user);
      const prepended = screen.getByTestId('prepended');
      const edit = screen.getByRole('menuitem', { name: 'Edit list' });
      expect(
        prepended.compareDocumentPosition(edit) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  describe('Owner', () => {
    // Delete moved into the list form's footer, so the menu's one row is the
    // door to that form.
    it('Default_RendersEditListAsTheOnlyRow', async () => {
      const user = userEvent.setup();
      renderMenu();
      await openMenu(user);
      const items = screen.getAllByRole('menuitem').map((el) => el.textContent);
      expect(items).toEqual(['Edit list']);
    });

    // Claim visibility is adjusted from the hero tile and from the viewer's
    // baseline; a menu row would be a second, divergent entry point.
    it('Default_CarriesNoSpoilerRow', async () => {
      const user = userEvent.setup();
      renderMenu();
      await openMenu(user);
      expect(
        screen.queryByRole('menuitem', { name: /spoilers/i })
      ).not.toBeInTheDocument();
    });

    // The default view already is what a viewer sees, so there is nothing to
    // preview.
    it('Default_CarriesNoPreviewRow', async () => {
      const user = userEvent.setup();
      renderMenu();
      await openMenu(user);
      expect(
        screen.queryByRole('menuitem', { name: /[Pp]review/ })
      ).not.toBeInTheDocument();
    });
  });

  describe('Viewer', () => {
    it('Default_SuppressesEditList', async () => {
      const user = userEvent.setup();
      renderMenu({ isOwner: false });
      await openMenu(user);
      expect(
        screen.queryByRole('menuitem', { name: 'Edit list' })
      ).not.toBeInTheDocument();
    });

    it('WithPrependedItems_RendersOnlyPrependedItems', async () => {
      const user = userEvent.setup();
      renderMenu({
        isOwner: false,
        prependedItems: <div data-testid="prepended" />,
      });
      await openMenu(user);
      expect(screen.getByTestId('prepended')).toBeInTheDocument();
      expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
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
      expect(screen.getByTestId('list-form-container')).toBeInTheDocument();
    });

    it('BelowTheOwnerFloor_FormRendersItsDeleteDisabled', async () => {
      const user = userEvent.setup();
      renderMenu({}, false);
      await openEdit(user);
      expect(screen.getByTestId('list-form-container')).toHaveAttribute(
        'data-delete-disabled',
        'true'
      );
    });

    it('CloseEdit_UnmountsListFormContainer', async () => {
      const user = userEvent.setup();
      renderMenu();
      await openEdit(user);
      await user.click(screen.getByRole('button', { name: 'close-form' }));
      expect(screen.queryByTestId('list-form-container')).not.toBeInTheDocument();
    });
  });
});
