import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ListOwnerTabs from '../ListOwnerTabs';
import { OwnerTabsContext } from '../ownerTabs';

const formProps = vi.hoisted(() => ({
  value: null as Record<string, unknown> | null,
}));
vi.mock('@/app/(main)/items/ui/components/itemform/ItemFormContainer', () => ({
  default: (p: Record<string, unknown>) => {
    formProps.value = p;
    return <div data-testid="item-form" />;
  },
}));

// `null` stands for a render outside a client navigation context, where
// useSearchParams has nothing to hand back.
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  query: '' as string | null,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => '/lists/l1',
  useSearchParams: () =>
    nav.query === null ? null : new URLSearchParams(nav.query),
}));

const LISTS = [
  { id: 'l1', name: 'Birthday' },
  { id: 'l2', name: 'Christmas' },
] as never;

// Stands in for the list's own item surface, which is where a card's menu
// offers the way into the reorder tab. The attribute reports whether the band
// offered that way in at all.
function InList() {
  const api = useContext(OwnerTabsContext);
  return (
    <div data-testid="in-list" data-can-reorder={String(!!api?.showReorder)}>
      <button type="button" onClick={api?.showReorder}>
        Reorder all items
      </button>
    </div>
  );
}

function Reorder() {
  const api = useContext(OwnerTabsContext);
  return (
    <div data-testid="reorder">
      <button type="button" onClick={api?.showList}>
        Done
      </button>
    </div>
  );
}

function renderTabs(inListCount = 2) {
  return render(
    <ListOwnerTabs
      listId="l1"
      inListCount={inListCount}
      lists={LISTS}
      actingAs="Owner"
      library={<div data-testid="library" />}
      reorder={<Reorder />}
    >
      <InList />
    </ListOwnerTabs>
  );
}

beforeEach(() => {
  nav.replace.mockClear();
  nav.query = '';
});

describe('ListOwnerTabs', () => {
  describe('PopulatedList', () => {
    it('Default_ShowsTheListSurfaceAndNotTheLibrary', () => {
      renderTabs();
      expect(screen.getByTestId('in-list')).toBeInTheDocument();
      expect(screen.queryByTestId('library')).not.toBeInTheDocument();
    });

    it('SelectAllItems_ReplacesTheListBodyWithTheLibrary', async () => {
      renderTabs();
      await userEvent.click(screen.getByRole('tab', { name: 'All items' }));
      expect(screen.getByTestId('library')).toBeInTheDocument();
      expect(screen.queryByTestId('in-list')).not.toBeInTheDocument();
    });

    it('ChooseFromExisting_SelectsTheAllItemsTab', async () => {
      renderTabs();
      await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
      await userEvent.click(
        screen.getByRole('menuitem', { name: 'Choose from existing' })
      );
      expect(screen.getByRole('tab', { name: 'All items' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByTestId('library')).toBeInTheDocument();
    });

    it('CreateANewItem_OpensTheFormWithThisListPreselected', async () => {
      renderTabs();
      await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
      await userEvent.click(
        screen.getByRole('menuitem', { name: 'Create a new item' })
      );
      expect(screen.getByTestId('item-form')).toBeInTheDocument();
      expect(formProps.value).toMatchObject({
        defaultListId: 'l1',
        actingAs: 'Owner',
      });
      expect(
        (formProps.value?.lists as { id: string }[]).map((l) => l.id)
      ).toEqual(['l1', 'l2']);
    });

    it('CloseTheForm_LeavesTheBandStanding', async () => {
      renderTabs();
      await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
      await userEvent.click(
        screen.getByRole('menuitem', { name: 'Create a new item' })
      );
      act(() => (formProps.value?.onClose as () => void)());
      expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
      expect(screen.getByTestId('in-list')).toBeInTheDocument();
    });

    it('SaveTheForm_ClosesIt', async () => {
      renderTabs();
      await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
      await userEvent.click(
        screen.getByRole('menuitem', { name: 'Create a new item' })
      );
      act(() => (formProps.value?.onSuccess as () => void)());
      expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
    });
  });

  describe('Reorder', () => {
    it('SelectTheTab_ReplacesTheListBodyWithTheOrderSurface', async () => {
      renderTabs();
      await userEvent.click(screen.getByRole('tab', { name: 'Reorder' }));
      expect(screen.getByTestId('reorder')).toBeInTheDocument();
      expect(screen.queryByTestId('in-list')).not.toBeInTheDocument();
    });

    it('Done_ReturnsToTheListSurface', async () => {
      renderTabs();
      await userEvent.click(screen.getByRole('tab', { name: 'Reorder' }));
      await userEvent.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByTestId('in-list')).toBeInTheDocument();
      expect(screen.queryByTestId('reorder')).not.toBeInTheDocument();
    });

    // A sort the owner left on is an order this surface cannot write, so the
    // way in from a card's menu drops the param and keeps the rest.
    it('OpenedFromACardMenu_SelectsTheTabAndResetsTheSort', async () => {
      nav.query = 'sort=name_asc&q=cake';
      renderTabs();
      await userEvent.click(
        screen.getByRole('button', { name: 'Reorder all items' })
      );
      expect(screen.getByTestId('reorder')).toBeInTheDocument();
      expect(nav.replace).toHaveBeenCalledWith('/lists/l1?q=cake');
    });

    it('OpenedWithTheSortAsTheOnlyParam_ReplacesWithTheBarePath', async () => {
      nav.query = 'sort=name_asc';
      renderTabs();
      await userEvent.click(
        screen.getByRole('button', { name: 'Reorder all items' })
      );
      expect(nav.replace).toHaveBeenCalledWith('/lists/l1');
    });

    // With no sort on there is nothing to drop, and a replace that changes no
    // param still refreshes the tree — remounting the band under the press
    // that opened the tab.
    it('OpenedWithNoSortToDrop_SelectsTheTabWithoutNavigating', async () => {
      nav.query = null;
      renderTabs();
      await userEvent.click(
        screen.getByRole('button', { name: 'Reorder all items' })
      );
      expect(screen.getByTestId('reorder')).toBeInTheDocument();
      expect(nav.replace).not.toHaveBeenCalled();
    });

    it('SingleEntry_OffersNeitherTheTabNorTheMenuRow', () => {
      renderTabs(1);
      expect(screen.queryByRole('tab', { name: 'Reorder' })).toBeNull();
      expect(screen.getByTestId('in-list')).toHaveAttribute(
        'data-can-reorder',
        'false'
      );
    });
  });

  describe('EmptyList', () => {
    it('Default_OpensOnTheLibrary', () => {
      renderTabs(0);
      expect(screen.getByTestId('library')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'All items' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });
});
