import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ItemDisplay, ListTable } from '@/lib/types';
import ItemsPage from '../ItemsPage';

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: '/items',
  search: '',
  searchNull: false,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => nav.pathname,
  useSearchParams: () => (nav.searchNull ? null : new URLSearchParams(nav.search)),
}));

vi.mock('../ItemsBrowser', () => ({
  default: (props: {
    mode: string;
    items: unknown[];
    archivedView?: boolean;
    showArchiveAction?: boolean;
  }) => (
    <div
      data-testid="items-browser"
      data-mode={props.mode}
      data-item-count={props.items.length}
      data-archived-view={String(props.archivedView)}
      data-show-archive-action={String(props.showArchiveAction)}
    />
  ),
}));
vi.mock('../itemform/ItemFormContainer', () => ({
  default: (props: {
    lists: unknown[];
    user_id: string;
    onClose: () => void;
  }) => (
    <div
      data-testid="item-form"
      data-lists-count={props.lists.length}
      data-user-id={props.user_id}
    >
      <button type="button" onClick={props.onClose}>
        close-form
      </button>
    </div>
  ),
}));

const ACTIVE = [{ id: 'a1' }, { id: 'a2' }] as unknown as ItemDisplay[];
const ARCHIVED = [{ id: 'r1' }] as unknown as ItemDisplay[];
const LISTS = [{ id: 'l1' }, { id: 'l2' }] as unknown as ListTable[];

function renderPage(
  overrides: Partial<Parameters<typeof ItemsPage>[0]> = {}
) {
  return render(
    <ItemsPage
      items={ACTIVE}
      archivedItems={ARCHIVED}
      user_id="viewer"
      user_name="Test V"
      lists={LISTS}
      initialPageSize={24}
      {...overrides}
    />
  );
}

beforeEach(() => {
  nav.replace.mockReset();
  nav.pathname = '/items';
  nav.search = '';
  nav.searchNull = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ItemsPage', () => {
  describe('TabSelection', () => {
    it('TabArchivedParam_ShowsArchivedSet', () => {
      nav.search = 'tab=archived';
      renderPage();
      const browser = screen.getByTestId('items-browser');
      expect(browser).toHaveAttribute('data-item-count', '1');
      expect(browser).toHaveAttribute('data-archived-view', 'true');
    });

    it('TabActiveOrAbsent_ShowsActiveSet', () => {
      renderPage();
      const browser = screen.getByTestId('items-browser');
      expect(browser).toHaveAttribute('data-item-count', '2');
      expect(browser).toHaveAttribute('data-archived-view', 'false');
    });
  });

  describe('TabLabels', () => {
    it('Tabs_RenderRoleTabWithCountsAndAriaSelected', () => {
      renderPage();
      const active = screen.getByRole('tab', { name: 'Active (2)' });
      const archived = screen.getByRole('tab', { name: 'Archived (1)' });
      expect(active).toHaveAttribute('aria-selected', 'true');
      expect(archived).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('TabSwitch', () => {
    it('SwitchToArchived_ReplaceSetsTabRemovesPage', () => {
      nav.search = 'page=3';
      renderPage();
      fireEvent.click(screen.getByRole('tab', { name: 'Archived (1)' }));
      expect(nav.replace).toHaveBeenCalledWith('/items?tab=archived');
    });

    it('SwitchToActive_ReplaceRemovesTabAndPage', () => {
      nav.search = 'tab=archived&page=2';
      renderPage();
      fireEvent.click(screen.getByRole('tab', { name: 'Active (2)' }));
      expect(nav.replace).toHaveBeenCalledWith('/items');
    });
  });

  describe('EmptyStates', () => {
    it('ActiveEmpty_RendersEmptyItemWithNewItemAffordance', () => {
      renderPage({ items: [] });
      expect(screen.getByText('No Items Found')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Create Item/ })
      ).toBeInTheDocument();
      expect(screen.queryByTestId('items-browser')).not.toBeInTheDocument();
    });

    it('ArchivedEmpty_RendersDistinctMessageWithoutNewItemAffordance', () => {
      nav.search = 'tab=archived';
      renderPage({ archivedItems: [] });
      expect(screen.getByText('No archived items')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Create Item/ })
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('items-browser')).not.toBeInTheDocument();
    });
  });

  describe('NonEmpty', () => {
    it('NonEmptySet_RendersItemsBrowserWithModeItemsAndArchiveFlags', () => {
      renderPage();
      const browser = screen.getByTestId('items-browser');
      expect(browser).toHaveAttribute('data-mode', 'items');
      expect(browser).toHaveAttribute('data-show-archive-action', 'true');
      expect(browser).toHaveAttribute('data-archived-view', 'false');
    });
  });

  describe('NewItemToggle', () => {
    it('ClickNewItem_MountsItemFormContainerWithListsAndUser', () => {
      renderPage();
      expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'New Item' }));
      const form = screen.getByTestId('item-form');
      expect(form).toHaveAttribute('data-lists-count', '2');
      expect(form).toHaveAttribute('data-user-id', 'viewer');
    });

    it('FormOnClose_UnmountsItemForm', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'New Item' }));
      expect(screen.getByTestId('item-form')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'close-form' }));
      expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
    });

    it('MissingListsAndUserId_FormDefaultsToEmpty', () => {
      renderPage({ lists: undefined, user_id: undefined });
      fireEvent.click(screen.getByRole('button', { name: 'New Item' }));
      const form = screen.getByTestId('item-form');
      expect(form).toHaveAttribute('data-lists-count', '0');
      expect(form).toHaveAttribute('data-user-id', '');
    });
  });

  describe('NullSearchParams', () => {
    it('NullSearchParams_DefaultsToActiveTabAndReplacesWithoutQuery', () => {
      nav.searchNull = true;
      renderPage();
      expect(
        screen.getByRole('tab', { name: 'Active (2)' })
      ).toHaveAttribute('aria-selected', 'true');
      fireEvent.click(screen.getByRole('tab', { name: 'Archived (1)' }));
      expect(nav.replace).toHaveBeenCalledWith('/items?tab=archived');
    });
  });
});
