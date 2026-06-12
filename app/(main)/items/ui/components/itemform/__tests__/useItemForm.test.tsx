import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createItem, updateItem } from '@/lib/data/item.actions';
import { useItemForm } from '../useItemForm';

vi.mock('@/lib/data/item.actions', () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
}));

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'react-hot-toast';

// jsdom never fires <img> load events; this controllable stub lets the
// image_url validation branches (valid / too-small / error) run deterministically.
let imageMode: 'valid' | 'small' | 'error' = 'valid';
class FakeImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_v: string) {
    queueMicrotask(() => {
      if (imageMode === 'error') {
        this.onerror?.();
        return;
      }
      const size = imageMode === 'small' ? 5 : 100;
      this.naturalWidth = size;
      this.naturalHeight = size;
      this.onload?.();
    });
  }
}

const submit = () =>
  ({ preventDefault: vi.fn() }) as unknown as React.FormEvent;

beforeEach(() => {
  vi.clearAllMocks();
  imageMode = 'valid';
  vi.stubGlobal('Image', FakeImage);
  vi.mocked(createItem).mockResolvedValue({ success: true } as never);
  vi.mocked(updateItem).mockResolvedValue({ success: true } as never);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const EXISTING = {
  id: 'i1',
  name: 'Mug',
  description: 'Blue',
  image_url: '',
  quantity_limit: 3,
  stores: [{ name: 'Amazon', link: 'https://a.com', price: '9.99' }],
  lists: [{ id: 'l1', name: 'Birthday' }],
};

describe('useItemForm', () => {
  describe('OverlongPrefilledName', () => {
    const LONG_NAME = 'Sport Silicone Band '.repeat(11); // 220 chars

    it('Mount_SetsMaxLengthErrorImmediately', () => {
      const { result } = renderHook(() => useItemForm({ name: LONG_NAME }));
      expect(result.current.errors.name).toBe(
        'Title must be less than 100 characters'
      );
    });

    it('Submit_BlocksCreate-ToastsFixErrors', async () => {
      const { result } = renderHook(() => useItemForm({ name: LONG_NAME }));
      await act(() => result.current.handleSubmit(submit()));
      expect(createItem).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        'Please fix the form errors before submitting'
      );
    });

    it('EditedToValidLength_ClearsErrorAndSubmits', async () => {
      const { result } = renderHook(() => useItemForm({ name: LONG_NAME }));
      act(() => result.current.handleNameChange('Sport Silicone Band'));
      expect(result.current.errors.name).toBe('');
      await act(() => result.current.handleSubmit(submit()));
      await waitFor(() =>
        expect(createItem).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Sport Silicone Band' })
        )
      );
    });
  });

  describe('FetchedPriceProvenance', () => {
    const FETCHED_STORE = {
      name: 'Amazon',
      link: 'https://a.co/x',
      price: '24.50',
      price_fetched_at: '2026-06-01T12:00:00.000Z',
      canonical_url: 'https://a.co/c',
      currency: 'USD',
    };

    it('DateValuedFetchedAt_NormalizesToIsoString', () => {
      const { result } = renderHook(() =>
        useItemForm({
          stores: [
            {
              ...FETCHED_STORE,
              price_fetched_at: new Date('2026-06-01T12:00:00.000Z'),
            },
          ],
        })
      );
      expect(result.current.formState.stores[0].price_fetched_at).toBe(
        '2026-06-01T12:00:00.000Z'
      );
    });

    it('EditPrice_DropsPriceFetchedAt-KeepsCanonicalAndCurrency', () => {
      const { result } = renderHook(() =>
        useItemForm({ stores: [FETCHED_STORE] })
      );
      act(() => result.current.handleStoreChange(0, '30.00', 'price'));
      expect(result.current.formState.stores[0].price_fetched_at).toBeNull();
      expect(result.current.formState.stores[0].canonical_url).toBe(
        'https://a.co/c'
      );
      expect(result.current.formState.stores[0].currency).toBe('USD');
    });

    it('EditLink_KeepsPriceFetchedAt', () => {
      const { result } = renderHook(() =>
        useItemForm({ stores: [FETCHED_STORE] })
      );
      act(() =>
        result.current.handleStoreChange(0, 'https://other.com', 'link')
      );
      expect(result.current.formState.stores[0].price_fetched_at).toBe(
        '2026-06-01T12:00:00.000Z'
      );
    });
  });

  describe('Initialization', () => {
    it('NewItem_DefaultsEmptyStateWithOneStore', () => {
      const { result } = renderHook(() => useItemForm());
      expect(result.current.formState.id).toBe('');
      expect(result.current.formState.name).toBe('');
      expect(result.current.formState.quantity_limit).toBe(1);
      expect(result.current.formState.stores).toEqual([
        { name: '', link: '', price: '' },
      ]);
      expect(result.current.formState.lists).toEqual([]);
    });

    it('ExistingItem_PopulatesStateAndMapsLists', () => {
      const { result } = renderHook(() => useItemForm(EXISTING as never));
      expect(result.current.formState.id).toBe('i1');
      expect(result.current.formState.name).toBe('Mug');
      expect(result.current.formState.quantity_limit).toBe(3);
      expect(result.current.formState.lists).toEqual([
        { value: 'l1', label: 'Birthday' },
      ]);
    });

    it('NullQuantityLimit_PreservedAsNull', () => {
      const { result } = renderHook(() =>
        useItemForm({ ...EXISTING, quantity_limit: null } as never)
      );
      expect(result.current.formState.quantity_limit).toBeNull();
    });

    it('NoStores_DefaultsToSingleEmptyStore', () => {
      const { result } = renderHook(() =>
        useItemForm({ ...EXISTING, stores: [] } as never)
      );
      expect(result.current.formState.stores).toEqual([
        { name: '', link: '', price: '' },
      ]);
    });
  });

  describe('FieldHandlers', () => {
    it('NameChange_UpdatesStateAndClearsError', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleNameChange('Gift'));
      expect(result.current.formState.name).toBe('Gift');
      expect(result.current.errors.name).toBe('');
    });

    it('DescriptionChange_UpdatesState', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleDescriptionChange('desc'));
      expect(result.current.formState.description).toBe('desc');
    });

    it('ImageUrlChange_UpdatesState', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleImageUrlChange('https://img'));
      expect(result.current.formState.image_url).toBe('https://img');
    });

    it('QuantityLimitChange_UpdatesState', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleQuantityLimitChange(null));
      expect(result.current.formState.quantity_limit).toBeNull();
    });

    it('StoreChange_UpdatesNamedStoreField', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleStoreChange(0, 'Target', 'name'));
      expect(result.current.formState.stores[0].name).toBe('Target');
    });

    it('StoreAdd_AppendsEmptyStore', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleStoreAdd(1));
      expect(result.current.formState.stores).toHaveLength(2);
    });

    it('StoreRemove_DropsStoreAtIndex', () => {
      const { result } = renderHook(() => useItemForm(EXISTING as never));
      act(() => result.current.handleStoreAdd(1));
      act(() => result.current.handleStoreRemove(0));
      expect(result.current.formState.stores).toHaveLength(1);
    });

    it('ListChange_UpdatesListsAndClearsError', () => {
      const { result } = renderHook(() => useItemForm());
      act(() =>
        result.current.handleListChange([{ value: 'l2', label: 'Wedding' }])
      );
      expect(result.current.formState.lists).toEqual([
        { value: 'l2', label: 'Wedding' },
      ]);
    });
  });

  describe('DebouncedValidation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('EmptyNameAfterDebounce_SetsRequiredError', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleNameChange(''));
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.errors.name).toBe('Name is required');
    });

    it('RapidNameChanges_OnlyLastValidationApplies', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleNameChange(''));
      act(() => result.current.handleNameChange('Filled'));
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.errors.name).toBe('');
    });

    it('PendingTimerAtUnmount_CleanedUp', () => {
      const { result, unmount } = renderHook(() => useItemForm());
      act(() => result.current.handleNameChange('x'));
      expect(() => unmount()).not.toThrow();
    });

    it('QuantityBelowOne_SetsQuantityError', () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleQuantityLimitChange(0));
      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.errors.quantity_limit).toBe(
        'Quantity limit must be at least 1'
      );
    });
  });

  // Validation is debounce-driven (1s) and one field at a time; driving it
  // through the debounced handlers is the only path that mirrors how the live
  // form populates `errors` (handleSubmit reads a stale `errors` closure, so it
  // never blocks on freshly-computed errors — see SubmitWithExistingError).
  describe('ImageValidation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    async function validateImage(url: string) {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleImageUrlChange(url));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      return result;
    }

    it('LoadError_SetsImageUrlError', async () => {
      imageMode = 'error';
      const result = await validateImage('https://broken');
      expect(result.current.errors.image_url).toBe(
        'Please provide a valid image URL'
      );
    });

    it('TooSmallImage_SetsImageUrlError', async () => {
      imageMode = 'small';
      const result = await validateImage('https://tiny');
      expect(result.current.errors.image_url).toBe(
        'Please provide a valid image URL'
      );
    });

    it('ValidImage_LeavesImageUrlErrorEmpty', async () => {
      imageMode = 'valid';
      const result = await validateImage('https://good');
      expect(result.current.errors.image_url).toBe('');
    });
  });

  describe('StoreValidation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    // Apply each [value, field] op (immediate state); only the LAST op's
    // validation survives the shared debounce, so order the asserted field last.
    function driveStore(ops: Array<[string, 'name' | 'price' | 'link']>) {
      const { result } = renderHook(() => useItemForm());
      for (const [value, field] of ops) {
        act(() => result.current.handleStoreChange(0, value, field));
      }
      act(() => vi.advanceTimersByTime(1000));
      return result;
    }

    it('MissingNameWithPrice_SetsStoreNameError', () => {
      const result = driveStore([
        ['9.99', 'price'],
        ['', 'name'],
      ]);
      expect(result.current.errors.stores[0].name).toBe(
        'Store name required when price or link is added'
      );
    });

    it('InvalidPriceFormat_SetsStorePriceError', () => {
      const result = driveStore([['abc', 'price']]);
      expect(result.current.errors.stores[0].price).toBe(
        'Invalid price format 00.00'
      );
    });

    it('MissingPriceWithName_SetsStorePriceError', () => {
      const result = driveStore([
        ['Shop', 'name'],
        ['', 'price'],
      ]);
      expect(result.current.errors.stores[0].price).toBe(
        'Price is required when store name and/or link is provided'
      );
    });

    it('InvalidLink_SetsStoreLinkError', () => {
      const result = driveStore([['notaurl', 'link']]);
      expect(result.current.errors.stores[0].link).toContain(
        'http:// is missing'
      );
    });

    it('MalformedHttpLink_SetsStoreLinkError', () => {
      const result = driveStore([['http://', 'link']]);
      expect(result.current.errors.stores[0].link).toContain(
        'Please verify the link'
      );
    });

    it('MissingLinkWithName_SetsStoreLinkError', () => {
      const result = driveStore([
        ['Shop', 'name'],
        ['', 'link'],
      ]);
      expect(result.current.errors.stores[0].link).toBe(
        'Link is required when store name and/or price is provided'
      );
    });

    it('ValidStoreFields_LeaveNoStoreErrors', () => {
      const result = driveStore([
        ['Shop', 'name'],
        ['9.99', 'price'],
        ['https://s.com', 'link'],
      ]);
      expect(result.current.errors.stores[0]).toEqual({
        name: '',
        link: '',
        price: '',
      });
    });
  });

  describe('Submit', () => {
    async function submitValid(
      hookArgs: Parameters<typeof useItemForm> = [],
      itemName = 'Gift'
    ) {
      const { result } = renderHook(() => useItemForm(...hookArgs));
      act(() => result.current.handleNameChange(itemName));
      await act(async () => {
        await result.current.handleSubmit(submit());
      });
      return result;
    }

    it('CreateSuccessNoReturnTo_ToastsAndPushesItems', async () => {
      await submitValid();
      expect(createItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Gift' })
      );
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Item created successfully')
      );
      expect(router.push).toHaveBeenCalledWith('/items');
      expect(router.refresh).toHaveBeenCalled();
    });

    it('CreateSuccessWithReturnTo_PushesReturnTo', async () => {
      await submitValid([undefined, '/lists/l1']);
      expect(router.push).toHaveBeenCalledWith('/lists/l1');
    });

    it('CreateSuccessWithOnSuccess_CallsOnSuccess-Refresh-NoPush', async () => {
      const onSuccess = vi.fn();
      await submitValid([undefined, undefined, onSuccess]);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(router.refresh).toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it('ExistingItem_DispatchesUpdate', async () => {
      const result = await submitValid([EXISTING as never]);
      expect(updateItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'i1' })
      );
      expect(createItem).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith('Item updated successfully')
      );
      expect(result.current.isPending).toBe(false);
    });

    it('EmptyName_BlocksSubmitWithFixErrorsToast', async () => {
      const { result } = renderHook(() => useItemForm());
      await act(async () => {
        await result.current.handleSubmit(submit());
      });
      expect(toast.error).toHaveBeenCalledWith(
        'Please fix the form errors before submitting'
      );
      expect(createItem).not.toHaveBeenCalled();
    });

    it('ActionFailureWithMessage_ToastsMessage', async () => {
      vi.mocked(createItem).mockResolvedValue({
        success: false,
        message: 'Duplicate name',
      } as never);
      await submitValid();
      expect(toast.error).toHaveBeenCalledWith('Duplicate name');
    });

    it('ActionFailureNoMessage_ToastsGenericError', async () => {
      vi.mocked(createItem).mockResolvedValue({ success: false } as never);
      await submitValid();
      expect(toast.error).toHaveBeenCalledWith('An error occurred');
    });

    it('ActionThrows_ToastsUnexpectedError', async () => {
      vi.mocked(createItem).mockRejectedValue(new Error('boom'));
      await submitValid();
      expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });
  });

  describe('SubmitGating', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('ExistingFieldErrorWithNameFilled_BlocksSubmit', async () => {
      const { result } = renderHook(() => useItemForm());
      act(() => result.current.handleNameChange('Gift'));
      act(() => result.current.handleQuantityLimitChange(0));
      act(() => vi.advanceTimersByTime(1000));
      await act(async () => {
        await result.current.handleSubmit(submit());
      });
      expect(toast.error).toHaveBeenCalledWith(
        'Please fix the form errors before submitting'
      );
      expect(createItem).not.toHaveBeenCalled();
    });
  });
});
