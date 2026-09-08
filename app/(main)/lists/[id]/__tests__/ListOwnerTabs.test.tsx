import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ListOwnerTabs from '../ListOwnerTabs';

const formProps = vi.hoisted(() => ({
  value: null as Record<string, unknown> | null,
}));
vi.mock('@/app/(main)/items/ui/components/itemform/ItemFormContainer', () => ({
  default: (p: Record<string, unknown>) => {
    formProps.value = p;
    return <div data-testid="item-form" />;
  },
}));

const LISTS = [
  { id: 'l1', name: 'Birthday' },
  { id: 'l2', name: 'Christmas' },
] as never;

function renderTabs(inListCount = 2) {
  return render(
    <ListOwnerTabs
      listId="l1"
      inListCount={inListCount}
      lists={LISTS}
      actingAs="Owner"
      library={<div data-testid="library" />}
    >
      <div data-testid="in-list" />
    </ListOwnerTabs>
  );
}

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
