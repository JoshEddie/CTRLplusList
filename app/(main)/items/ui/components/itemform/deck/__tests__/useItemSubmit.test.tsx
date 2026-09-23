import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const actions = vi.hoisted(() => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));
vi.mock('@/lib/data/item.actions', () => actions);

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

import { useItemSubmit } from '../useItemSubmit';
import { blankItem } from '../viewModel';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('useItemSubmit', () => {
  it('CreateSuccessWithOnSuccess_CallsOnSuccessWithTheNewIdAndRefresh', async () => {
    actions.createItem.mockResolvedValue({
      success: true,
      message: 'ok',
      id: 'new-1',
    });
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useItemSubmit(blankItem(), false, onSuccess)
    );
    await act(async () => {
      await result.current.submit();
    });
    expect(actions.createItem).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith('new-1');
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Item created successfully');
  });

  it('EditSuccess_CallsUpdateItem-ToastUpdated', async () => {
    actions.updateItem.mockResolvedValue({ success: true, message: 'ok' });
    const { result } = renderHook(() =>
      useItemSubmit({ ...blankItem(), id: 'i1' }, true, vi.fn())
    );
    await act(async () => {
      await result.current.submit();
    });
    expect(actions.updateItem).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('Item updated successfully');
  });

  it('Failure_ShowsServerMessageToast-NoOnSuccess', async () => {
    actions.createItem.mockResolvedValue({ success: false, message: 'nope' });
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useItemSubmit(blankItem(), false, onSuccess)
    );
    await act(async () => {
      await result.current.submit();
    });
    expect(toast.error).toHaveBeenCalledWith('nope');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('FailureNoMessage_ShowsDefaultErrorToast', async () => {
    actions.createItem.mockResolvedValue({ success: false });
    const { result } = renderHook(() =>
      useItemSubmit(blankItem(), false, vi.fn())
    );
    await act(async () => {
      await result.current.submit();
    });
    expect(toast.error).toHaveBeenCalledWith('An error occurred');
  });

  it('Throws_ShowsGenericErrorToast', async () => {
    actions.createItem.mockRejectedValue(new Error('boom'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() =>
      useItemSubmit(blankItem(), false, vi.fn())
    );
    await act(async () => {
      await result.current.submit();
    });
    expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred');
    expect(consoleError).toHaveBeenCalled();
  });
});
