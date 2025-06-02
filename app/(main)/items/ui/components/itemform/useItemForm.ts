'use client';

import { createItem, updateItem } from '@/app/actions/items';
import { ItemDetails, ItemStoreTable, ItemTable, ListTable } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

const useDebounce = <T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
};

interface FormErrors {
  name: string;
  image_url: string;
  quantity_limit: string;
  stores: Array<{ name: string; link: string; price: string }>;
  lists: string;
}

export function useItemForm(initialItem?: ItemTable & {
    stores: ItemStoreTable[];
    lists: ListTable[];
  }, user_id?: string) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const [formState, setFormState] = useState<ItemDetails>({
    id: initialItem?.id || '',
    name: initialItem?.name || '',
    image_url: initialItem?.image_url || '',
    quantity_limit: initialItem?.quantity_limit || 1,
    stores: initialItem?.stores?.length
      ? initialItem.stores
      : [
          { name: '', link: '', price: '' },
        ],
    lists: initialItem?.lists?.map((list) => {
      return {
        value: list.id.toString(),
        label: list.name,
      };
    }) || [],
    user_id: user_id || '',
  });

  const [errors, setErrors] = useState<FormErrors>({
    name: '',
    image_url: '',
    quantity_limit: '',
    stores: [
      { name: '', link: '', price: '' },
    ],
    lists: '',
  });

  const isValidHttpUrl = (url: string): { url: string; error?: string } => {
    try {
      if (url.match(/^https?:\/\//i)) {
        const urlObj = new URL(url);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          return { url, error: 'http:// is missing' };
        }
        return { url: urlObj.toString() };
      }
      return { url, error: 'http:// is missing' };
    } catch (e) {
      console.error(e);
      return {
        url,
        error: 'Please verify the link (i.e. https://example.com)',
      };
    }
  };

  const validateForm = useCallback(
    async (
      value?: string | number | null,
      type?: 'name' | 'image_url' | 'quantity_limit'
    ) => {
      const newErrors = { ...errors };

      if (type === 'name') {
        if (!value) {
          newErrors.name = 'Name is required';
        } else {
          newErrors.name = '';
        }
      }

      if (type === 'image_url') {
        newErrors.image_url = '';
        if (value) {
          const img = new Image();
          img.src = value as string;
          const isValid = await new Promise((resolve) => {
            img.onerror = () => resolve(false);
            img.onload = () =>
              resolve(img.naturalWidth > 10 && img.naturalHeight > 10);
          });
          if (!isValid) {
            newErrors.image_url = 'Please provide a valid image URL';
          }
        }
      }

      if (type === 'quantity_limit') {
        if ((value as number) < 0) {
          newErrors.quantity_limit = 'Quantity limit must be greater than 0';
        } else {
          newErrors.quantity_limit = '';
        }
      }

      setErrors(newErrors);
    },
    [errors]
  );

  const validateStoreField = useCallback(
    (
      index: number,
      value: string | number,
      type: 'name' | 'price' | 'link'
    ) => {
      const newErrors = { ...errors };
      newErrors.stores[index] = { name: '', link: '', price: '' };

      if (type === 'name') {
        if (
          !value &&
          (formState.stores[index].link || formState.stores[index].price)
        ) {
          newErrors.stores[index].name =
            'Store name required when price or link is added';
        }
      }

      if (type === 'price') {
        if (value && !value.toString().match(/^\$?[0-9]+(\.[0-9][0-9]?)?$/)) {
          value = value.toString().replace(/[^.0-9]/gi, '');
          newErrors.stores[index].price = 'Invalid price format 00.00';
        }
        if (
          !value &&
          (formState.stores[index].name || formState.stores[index].link)
        ) {
          newErrors.stores[index].price =
            'Price is required when store name and/or link is provided';
        }
      }

      if (type === 'link') {
        if (value) {
          const formatted = isValidHttpUrl(value.toString());
          if (formatted.error) {
            newErrors.stores[index].link = `Invalid URL: ${formatted.error}`;
          }
        } else if (
          !value &&
          (formState.stores[index].name || formState.stores[index].price)
        ) {
          newErrors.stores[index].link =
            'Link is required when store name and/or price is provided';
        }
      }

      setErrors(newErrors);
    },
    [errors, formState.stores]
  );

  const debouncedFormValidate = useDebounce(validateForm, 1000);
  const debouncedStoreValidate = useDebounce(validateStoreField, 1000);

  const handleNameChange = useCallback(
    (value: string) => {
      setFormState((prev) => ({ ...prev, name: value }));
      setErrors((prev) => ({ ...prev, name: '' }));
      debouncedFormValidate(value, 'name');
    },
    [debouncedFormValidate]
  );

  const handleImageUrlChange = useCallback(
    (value: string) => {
      setFormState((prev) => ({ ...prev, image_url: value }));
      setErrors((prev) => ({ ...prev, image_url: '' }));
      debouncedFormValidate(value, 'image_url');
    },
    [debouncedFormValidate]
  );

  const handleQuantityLimitChange = useCallback(
    (value: number) => {
      setFormState((prev) => ({ ...prev, quantity_limit: value }));
      setErrors((prev) => ({ ...prev, quantity_limit: '' }));
      debouncedFormValidate(value, 'quantity_limit');
    },
    [debouncedFormValidate]
  );

  const handleStoreChange = useCallback(
    (
      index: number,
      value: string | number,
      field: 'name' | 'link' | 'price'
    ) => {
      // Update the form state immediately
      const newStores = [...formState.stores];
      newStores[index] = { ...newStores[index], [field]: value };
      setFormState((prev) => ({ ...prev, stores: newStores }));

      // Clear errors for this field
      const newErrors = { ...errors };
      newErrors.stores[index] = { ...newErrors.stores[index], [field]: '' };
      setErrors(newErrors);

      // Schedule the validation
      debouncedStoreValidate(index, value, field);
    },
    [debouncedStoreValidate, errors, formState.stores]
  );

  const handleStoreAdd = useCallback((index: number) => {
    const newStores = [...formState.stores];
    while (index >= newStores.length) {
      newStores.push({ name: '', link: '', price: '' });
    }
    setFormState((prev) => ({ ...prev, stores: newStores }));

    const newErrors = { ...errors };
      
      while (index >= (newErrors.stores?.length || 0)) {
        newErrors.stores = [...(newErrors.stores || []), { name: '', link: '', price: '' }];
      }
      
      setErrors({...errors, stores: newErrors.stores});
    
  }, [errors, formState.stores]);

  const handleStoreRemove = useCallback(
    (index: number) => {
      const newStores = [...formState.stores];
      newStores.splice(index, 1);
      setFormState((prev) => ({ ...prev, stores: newStores }));

      const newErrors = { ...errors };
      newErrors.stores = newStores.map(() => ({ name: '', link: '', price: '' }));
      setErrors({...errors, stores: newErrors.stores});
    },
    [errors, formState.stores]
  );

  const handleListChange = useCallback(
    (selected: Array<{ value: string; label: string }>) => {
      setFormState((prev) => ({ ...prev, lists: selected }));
      setErrors((prev) => ({ ...prev, lists: '' }));
    },
    []
  );

  const isFormValid = useCallback(() => {
    // Check if any required fields are empty
    const isNameFilled = formState.name.trim() !== '';

    // Check if there are any validation errors
    const hasNoErrors =
      errors.name === '' &&
      errors.image_url === '' &&
      errors.quantity_limit === '' &&
      errors.lists === '' &&
      errors.stores.every(
        (store) => store.name === '' && store.link === '' && store.price === ''
      );

    // Form is valid if:
    // 1. No errors
    // 2. Name is filled
    return hasNoErrors && isNameFilled;
  }, [formState.name, errors]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsPending(true);

      try {
        // Run all validations
        await Promise.all([
          validateForm(formState.name, 'name'),
          validateForm(formState.image_url, 'image_url'),
          validateForm(formState.quantity_limit, 'quantity_limit'),
          ...formState.stores.flatMap((store, index) => [
            validateStoreField(index, store.name, 'name'),
            validateStoreField(index, store.link, 'link'),
            validateStoreField(index, store.price, 'price'),
          ]),
        ]);

        if (!isFormValid()) {
          toast.error('Please fix the form errors before submitting');
          return;
        }

        const result = initialItem?.id
          ? await updateItem(formState)
          : await createItem(formState);

        if (result.success) {
          toast.success(
            `Item ${initialItem?.id ? 'updated' : 'created'} successfully`
          );
          router.push('/items');
          router.refresh();
        } else {
          toast.error(result.message || 'An error occurred');
        }
      } catch (error) {
        toast.error('An unexpected error occurred');
        console.error('Form submission error:', error);
      } finally {
        setIsPending(false);
      }
    },
    [
      formState,
      initialItem?.id,
      isFormValid,
      router,
      validateForm,
      validateStoreField,
    ]
  );

  return {
    formState,
    errors,
    isPending,
    handleNameChange,
    handleImageUrlChange,
    handleListChange,
    handleQuantityLimitChange,
    handleStoreChange,
    handleStoreAdd,
    handleStoreRemove,
    handleSubmit,
  };
}
