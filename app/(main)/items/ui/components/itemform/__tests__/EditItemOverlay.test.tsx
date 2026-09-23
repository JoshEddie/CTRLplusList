import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getItemForEdit } from '@/lib/data/item.actions';
import EditItemOverlay from '../EditItemOverlay';

vi.mock('@/lib/data/item.actions', () => ({ getItemForEdit: vi.fn() }));

vi.mock('../ItemFormContainer', () => ({
  default: (p: {
    item: { name: string };
    lists: { name: string }[];
    deleteDisabled: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }) => (
    <div
      role="dialog"
      aria-label={`Editing ${p.item.name}`}
      data-lists={p.lists.map((l) => l.name).join(',')}
      data-delete-disabled={String(p.deleteDisabled)}
    >
      <button type="button" onClick={p.onClose}>
        form close
      </button>
      <button type="button" onClick={p.onSuccess}>
        form saved
      </button>
    </div>
  ),
}));

const LOADED = {
  item: { id: 'i1', name: 'Gift' },
  lists: [{ id: 'l1', name: 'Birthday' }],
  deleteDisabled: true,
};

function renderOverlay() {
  const onClose = vi.fn();
  render(<EditItemOverlay itemId="i1" onClose={onClose} />);
  return { onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getItemForEdit).mockResolvedValue(LOADED as never);
});

describe('EditItemOverlay', () => {
  it('Pending_ShowsLoadingStatusInShell', () => {
    vi.mocked(getItemForEdit).mockReturnValue(new Promise(() => {}));
    renderOverlay();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.getByText('Edit item')).toBeInTheDocument();
  });

  it('PendingEscapeKey_CallsOnClose', async () => {
    vi.mocked(getItemForEdit).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    const { onClose } = renderOverlay();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Loaded_MountsFormWithItemListsAndDeleteFloor', async () => {
    renderOverlay();
    const form = await screen.findByRole('dialog', { name: 'Editing Gift' });
    expect(getItemForEdit).toHaveBeenCalledWith('i1');
    expect(form).toHaveAttribute('data-lists', 'Birthday');
    expect(form).toHaveAttribute('data-delete-disabled', 'true');
  });

  it('FormCloses_CallsOnClose', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOverlay();
    await user.click(await screen.findByRole('button', { name: 'form close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('FormSaves_CallsOnClose', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOverlay();
    await user.click(await screen.findByRole('button', { name: 'form saved' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  describe('Unavailable', () => {
    it('NullResult_ShowsCouldNotLoadInShell', async () => {
      vi.mocked(getItemForEdit).mockResolvedValue(null);
      renderOverlay();
      expect(
        await screen.findByRole('heading', {
          name: 'This item couldn’t be loaded',
        })
      ).toBeInTheDocument();
    });

    it('Rejected_ShowsCouldNotLoadInShell-LogsError', async () => {
      const error = new Error('boom');
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.mocked(getItemForEdit).mockRejectedValue(error);
      renderOverlay();
      expect(
        await screen.findByRole('heading', {
          name: 'This item couldn’t be loaded',
        })
      ).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalledWith(
        'Error loading item for edit:',
        error
      );
    });
  });
});
