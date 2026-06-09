import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getItemEditData } from '@/app/actions/items';
import EditItemButton from '../EditItemButton';

vi.mock('@/app/actions/items', () => ({ getItemEditData: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));
vi.mock('../itemform/ItemFormContainer', () => ({
  default: (props: { onClose: () => void }) => (
    <button data-testid="item-form" onClick={props.onClose} />
  ),
}));

const editData = { item: { id: 'i1' }, lists: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EditItemButton', () => {
  it('Mounted_RendersEnabledEditButton', () => {
    const { unmount } = render(<EditItemButton itemId="i1" user_id="u1" />);
    const button = screen.getByRole('button', { name: 'Edit item' });
    expect(button).toBeEnabled();
    expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
    unmount();
  });

  it('ServerRender_RendersEditButtonWithoutForm', () => {
    expect(
      renderToString(<EditItemButton itemId="i1" user_id="u1" />)
    ).toContain('aria-label="Edit item"');
    expect(
      renderToString(<EditItemButton itemId="i1" user_id="u1" />)
    ).not.toContain('item-form');
  });

  describe('LoadSucceeds', () => {
    const renderWithLoadSuccess = () => {
      vi.mocked(getItemEditData).mockResolvedValue(editData as never);
      render(<EditItemButton itemId="i1" user_id="u1" />);
    };

    it('Click_PortalsItemFormIntoDocumentBody', async () => {
      renderWithLoadSuccess();
      fireEvent.click(screen.getByRole('button', { name: 'Edit item' }));
      const form = await screen.findByTestId('item-form');
      expect(document.body).toContainElement(form);
      expect(getItemEditData).toHaveBeenCalledWith('i1');
    });

    it('FormOnClose_RemovesPortaledForm', async () => {
      renderWithLoadSuccess();
      fireEvent.click(screen.getByRole('button', { name: 'Edit item' }));
      fireEvent.click(await screen.findByTestId('item-form'));
      expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
    });

    it('ClickAfterFormOpen_DoesNotRefetch', async () => {
      renderWithLoadSuccess();
      const button = screen.getByRole('button', { name: 'Edit item' });
      fireEvent.click(button);
      await screen.findByTestId('item-form');
      fireEvent.click(button);
      expect(getItemEditData).toHaveBeenCalledTimes(1);
    });
  });

  it('ClickWhileLoadPending_DoesNotRefetch', async () => {
    let resolveLoad!: (value: unknown) => void;
    vi.mocked(getItemEditData).mockImplementation(
      () => new Promise((resolve) => (resolveLoad = resolve)) as never
    );
    render(<EditItemButton itemId="i1" user_id="u1" />);
    const button = screen.getByRole('button', { name: 'Edit item' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(getItemEditData).toHaveBeenCalledTimes(1);
    resolveLoad(editData);
    await screen.findByTestId('item-form');
  });

  it('LoadReturnsNull_ShowsCouldNotLoadItemToast-NoForm', async () => {
    vi.mocked(getItemEditData).mockResolvedValue(null as never);
    render(<EditItemButton itemId="i1" user_id="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit item' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not load item')
    );
    expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
  });

  it('LoadRejects_ShowsCouldNotLoadItemToast-LogsError', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const failure = new Error('network down');
    vi.mocked(getItemEditData).mockRejectedValue(failure);
    render(<EditItemButton itemId="i1" user_id="u1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit item' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not load item')
    );
    expect(consoleError).toHaveBeenCalledWith('Failed to load item:', failure);
    consoleError.mockRestore();
  });
});
