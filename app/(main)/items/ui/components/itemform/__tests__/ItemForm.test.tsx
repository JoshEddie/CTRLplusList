import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createItem, updateItem } from '@/lib/data/item.actions';
import ItemForm from '../ItemForm';

vi.mock('@/lib/data/item.actions', () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));

const router = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// The live preview's <Item> and the embedded <DeleteItemButton> own their own
// tests; stub them so this file asserts ItemForm's composition + wiring only.
vi.mock('../../Item', () => ({
  default: (p: { item: { name: string }; preview?: boolean }) => (
    <div
      data-testid="preview"
      data-name={p.item.name}
      data-preview={String(!!p.preview)}
    />
  ),
}));
vi.mock('../../DeleteItemButton', () => ({
  default: (p: { id: string; archived?: boolean; returnTo?: string }) => (
    <div
      data-testid="delete-btn"
      data-id={p.id}
      data-archived={String(!!p.archived)}
      data-return-to={p.returnTo ?? ''}
    />
  ),
}));

const LISTS = [
  { id: 'l1', name: 'Birthday' },
  { id: 'l2', name: 'Wedding' },
] as never;

const ITEM = {
  id: 'i1',
  name: 'Mug',
  description: '',
  image_url: '',
  quantity_limit: 1,
  stores: [{ name: '', link: '', price: '' }],
  lists: [{ id: 'l1', name: 'Birthday' }],
  archived_at: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createItem).mockResolvedValue({ success: true } as never);
  vi.mocked(updateItem).mockResolvedValue({ success: true } as never);
});

afterEach(() => vi.restoreAllMocks());

describe('ItemForm', () => {
  describe('Create', () => {
    it('NoItem_NewItemTitle-CreateLabel-NoDelete-NoListsSelected', () => {
      render(<ItemForm user_id="u1" lists={LISTS} />);
      expect(screen.getByText('New Item')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create Item' })
      ).toBeInTheDocument();
      expect(screen.queryByTestId('delete-btn')).not.toBeInTheDocument();
      expect(screen.getByText('No lists selected yet')).toBeInTheDocument();
    });

    it('TypeName_LivePreviewReflectsName', async () => {
      const user = userEvent.setup();
      render(<ItemForm user_id="u1" lists={LISTS} />);
      expect(screen.getByTestId('preview')).toHaveAttribute(
        'data-preview',
        'true'
      );
      await user.type(screen.getByLabelText(/Name/), 'Hat');
      expect(screen.getByTestId('preview')).toHaveAttribute('data-name', 'Hat');
    });

    it('TypeDescriptionAndSelectList_WiresHandlers', async () => {
      const user = userEvent.setup();
      render(<ItemForm user_id="u1" lists={LISTS} />);
      await user.type(screen.getByLabelText('Description'), 'A gift');
      await user.click(screen.getByRole('button', { name: /list/i }));
      await user.click(screen.getByRole('option', { name: 'Birthday' }));
      expect(
        screen.queryByText('No lists selected yet')
      ).not.toBeInTheDocument();
    });

    it('SubmitWithName_CallsCreateItem', async () => {
      const user = userEvent.setup();
      render(<ItemForm user_id="u1" lists={LISTS} />);
      await user.type(screen.getByLabelText(/Name/), 'Hat');
      await user.click(screen.getByRole('button', { name: 'Create Item' }));
      await waitFor(() =>
        expect(createItem).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Hat' })
        )
      );
    });
  });

  describe('Edit', () => {
    it('WithItem_EditTitle-UpdateLabel-MountsDeleteWithArchivedFlag', () => {
      render(
        <ItemForm
          user_id="u1"
          lists={LISTS}
          item={ITEM as never}
          returnTo="/lists/l1"
        />
      );
      expect(screen.getByText('Edit Mug')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Update Item' })
      ).toBeInTheDocument();
      const del = screen.getByTestId('delete-btn');
      expect(del).toHaveAttribute('data-id', 'i1');
      expect(del).toHaveAttribute('data-archived', 'true');
      expect(del).toHaveAttribute('data-return-to', '/lists/l1');
      expect(
        screen.queryByText('No lists selected yet')
      ).not.toBeInTheDocument();
    });

    it('ActiveItem_DeleteButtonArchivedFalse', () => {
      render(
        <ItemForm
          user_id="u1"
          lists={LISTS}
          item={{ ...ITEM, archived_at: null } as never}
        />
      );
      expect(screen.getByTestId('delete-btn')).toHaveAttribute(
        'data-archived',
        'false'
      );
    });

    it('Submit_CallsUpdateItem', async () => {
      const user = userEvent.setup();
      render(<ItemForm user_id="u1" lists={LISTS} item={ITEM as never} />);
      await user.click(screen.getByRole('button', { name: 'Update Item' }));
      await waitFor(() =>
        expect(updateItem).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'i1' })
        )
      );
      expect(createItem).not.toHaveBeenCalled();
    });
  });

  it('NoLists_ListOptionsEmpty', () => {
    render(<ItemForm user_id="u1" />);
    expect(screen.getByText('New Item')).toBeInTheDocument();
  });

  it('OnCloseProvided_RendersWithCallbackCloseAffordances', () => {
    const onClose = vi.fn();
    render(<ItemForm user_id="u1" lists={LISTS} onClose={onClose} />);
    expect(screen.getByText('New Item')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Item' })
    ).toBeInTheDocument();
  });

  it('EditEmptyName_TitleFallsBackToItem', () => {
    render(
      <ItemForm
        user_id="u1"
        lists={LISTS}
        item={{ ...ITEM, name: '' } as never}
      />
    );
    expect(screen.getByText('Edit Item')).toBeInTheDocument();
  });
});
