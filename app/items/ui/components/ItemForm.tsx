'use client';

import {
  ActionResponse,
  createItem,
  updateItem,
} from '@/app/actions/items';
import CancelSubmitButtons from '@/app/ui/components/Form/CancelSubmitButtons';
import {
  Form,
  FormError,
  FormGroup,
  FormInput,
  FormLabel,
} from '@/app/ui/components/Form/Form';
import FormSelect from '@/app/ui/components/Form/FormSelect';
import SelectWrapper from '@/app/ui/components/SelectWrapper';
import '@/app/ui/styles/select.css';
import {
  ItemDetails,
  ItemStoreTable,
  ItemTable,
  ListTable,
  OptionType,
} from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useActionState, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Item from './Item';
import { StoreInputContainer } from './StoreInput';

interface ItemFormProps {
  item?: ItemTable & {
    stores: ItemStoreTable[];
    lists: ListTable[];
  };
  lists?: ListTable[];
  user_id: string;
}

const initialState: ActionResponse = {
  success: false,
  message: '',
  errors: undefined,
};

export default function ItemForm({ item, lists, user_id }: ItemFormProps) {
  const router = useRouter();
  const [itemForm, setItemForm] = useState<ItemDetails>({
    id: item?.id || '',
    name: item?.name || '',
    image_url: item?.image_url || '',
    quantity_limit: item?.quantity_limit || 1,
    stores: item?.stores || [
      {
        name: '',
        link: '',
        price: '',
      },
      {
        name: '',
        link: '',
        price: '',
      },
      {
        name: '',
        link: '',
        price: '',
      },
    ],
    user_id: user_id,
    lists: item?.lists?.map((list) => {
      console.log(list);
      return {
        value: list.id.toString(),
        label: list.name,
      };
    }) || [],
  });
  const listOptions: OptionType[] = useMemo(() => {
    if (!lists) return [];
    return lists.map((list) => ({
      value: list.id.toString(),
      label: list.name,
    }));
  }, [lists]);

  // Use useActionState hook for the form submission action
  const [state, formAction, isPending] = useActionState(async () => {
    const data: ItemDetails = {
      id: itemForm.id,
      name: itemForm.name,
      image_url: itemForm.image_url,
      quantity_limit: itemForm.quantity_limit,
      user_id: user_id,
      stores: itemForm.stores,
      lists: itemForm.lists,
    };

    try {
      // Call the appropriate action based on whether we're editing or creating
      const result = item
        ? await updateItem(data)
        : await createItem(data);

      // Handle successful submission
      if (result.success) {
        router.refresh();
        toast.success(`Item ${item ? 'updated' : 'created'} successfully`);
        router.push('/items');
      }

      return result;
    } catch (err) {
      return {
        success: false,
        message: (err as Error).message || 'An error occurred',
        errors: undefined,
      };
    }
  }, initialState);

  const handleListChange = (value: OptionType | OptionType[] | null) => {
    console.log('itemForm lists: ', itemForm.lists);
    console.log('value: ', value);
    if (!value) {
      setItemForm({
        ...itemForm,
        lists: [],
      });
      return;
    }
    const selectedList = Array.isArray(value) ? value : [value];
    console.log('selectedList: ', selectedList);
    const lists = selectedList.map((list) => ({
      value: list.value,
      label: list.label,
    }));

    console.log('selected lists: ', lists);

    setItemForm({
      ...itemForm,
      lists,
    });
  }

  return (
    <>
      <FormLabel>Preview Item</FormLabel>
      <Item item={itemForm} className="preview" />
      <Form action={formAction}>
        {state?.message && (
          <FormError
            className={`mb-4 ${
              state.success
                ? 'bg-green-100 text-green-800 border-green-300'
                : ''
            }`}
          >
            {state.message}
          </FormError>
        )}
        <div className="form">
          <FormGroup className="name-link-input">
            <FormGroup>
              <FormLabel>Name</FormLabel>
              <FormInput
                name="name"
                value={itemForm.name}
                required
                disabled={isPending}
                onChange={(e) => {
                  setItemForm({
                    ...itemForm,
                    name: e.target.value,
                  });
                }}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Image URL</FormLabel>
              <FormInput
                name="image_url"
                value={itemForm.image_url}
                placeholder="https://example.com/image.jpg"
                required
                disabled={isPending}
                onChange={(e) => {
                  setItemForm({
                    ...itemForm,
                    image_url: e.target.value,
                  });
                }}
              />
            </FormGroup>
          </FormGroup>
          <FormGroup className="occasion-quantity-input">
            <FormGroup>
              <FormLabel>Lists</FormLabel>
              <SelectWrapper>
                <FormSelect
                  name="lists"
                  options={listOptions}
                  defaultValue={item?.lists?.map((list) => ({
                    value: list.id.toString(),
                    label: list.name,
                  }))}
                  onChange={(value) => handleListChange(value)}
                  isPending={isPending}
                  placeholder="Select an occasion"
                  isMulti={true}
                />
              </SelectWrapper>
            </FormGroup>
            <FormGroup>
              <FormLabel>Quantity Limit</FormLabel>
              <SelectWrapper>
                <FormSelect
                  name="quantity_limit"
                  options={[
                    { value: 'Unlimited', label: 'Unlimited' },
                    { value: '1', label: '1' },
                  ]}
                  onChange={(quantity: OptionType | OptionType[] | null) => {
                    if (!quantity) {
                      setItemForm({
                        ...itemForm,
                        quantity_limit: 0,
                      });
                      return;
                    }
                    const selectedQuantity = Array.isArray(quantity)
                      ? quantity
                      : [quantity];
                    const quantity_limit =
                      selectedQuantity[0].value === 'Unlimited' ? 0 : 1;
                    setItemForm({
                      ...itemForm,
                      quantity_limit: quantity_limit,
                    });
                  }}
                  isPending={isPending}
                  defaultValue={{ value: '1', label: '1' }}
                />
              </SelectWrapper>
            </FormGroup>
          </FormGroup>
          <FormGroup>
            <FormLabel>Stores/Prices</FormLabel>
            <div className="stores-input-container">
              <StoreInputContainer
                itemForm={itemForm}
                setItemForm={setItemForm}
              />
            </div>
          </FormGroup>
        </div>
        <CancelSubmitButtons
          isPending={isPending}
          isEditing={item ? true : false}
          type="Item"
        />
      </Form>
    </>
  );
}
