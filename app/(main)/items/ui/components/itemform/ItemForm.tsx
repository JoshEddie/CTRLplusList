// ItemForm.tsx
'use client';

import CancelSubmitButtons from '@/app/ui/components/Form/CancelSubmitButtons';
import { Form, FormGroup, FormLabel } from '@/app/ui/components/Form/Form';
import { ItemDisplay, ItemStoreTable, ItemTable, ListTable, OptionType } from '@/lib/types';
import { useMemo } from 'react';
import Item from '../Item';
import { ImageUrlInput } from './ImageUrlInput';
import { ItemNameInput } from './ItemNameInput';
import { ListSelection } from './ListSelection';
import { QuantityLimitSelect } from './QuantityLimitSelect';
import { StoreInputContainer } from './StoreInput';
import { useItemForm } from './useItemForm';

interface ItemFormProps {
  item?: ItemTable & {
    stores: ItemStoreTable[];
    lists: ListTable[];
  };
  lists?: ListTable[];
  user_id: string;
}

export default function ItemForm({ item, lists, user_id }: ItemFormProps) {

  const {
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
  } = useItemForm(item, user_id);

  const listOptions: OptionType[] = useMemo(() => {
    if (!lists) return [];
    return lists.map((list) => ({
      value: list.id.toString(),
      label: list.name,
    }));
  }, [lists]);

  return (
    <div className='item-form-container'>
      <FormGroup>
        <FormLabel>Preview Item</FormLabel>
        <Item
          item={formState as unknown as ItemDisplay}
          className="preview"
          user_id={user_id}
        />
      </FormGroup>
      <Form onSubmit={handleSubmit}>
        <div className="form">
          <FormGroup className="name-link-input">
            <ItemNameInput
              value={formState.name}
              error={errors.name}
              onChange={handleNameChange}
              disabled={isPending}
            />
            <ImageUrlInput
              value={formState.image_url}
              error={errors.image_url}
              onChange={handleImageUrlChange}
              disabled={isPending}
            />
          </FormGroup>

          <FormGroup className="occasion-quantity-input">
            <ListSelection
              name="lists"
              options={listOptions}
              defaultValue={formState.lists?.map((list) => ({
                value: list.value,
                label: list.label,
              }))}
              onChange={(value) => handleListChange(value as OptionType[])}
              isPending={isPending}
              placeholder="Select a list"
              isMulti={true}
              error={errors.lists}
            />
            <QuantityLimitSelect
              name="quantity_limit"
              options={[
                { value: 'Unlimited', label: 'Unlimited' },
                { value: '1', label: '1' },
              ]}
              onChange={(quantity: OptionType | OptionType[] | null) => {
                if (!quantity) {
                  handleQuantityLimitChange(0);
                  return;
                }
                const selectedQuantity = Array.isArray(quantity)
                  ? quantity
                  : [quantity];
                const quantity_limit =
                  selectedQuantity[0].value === 'Unlimited' ? 0 : 1;
                handleQuantityLimitChange(quantity_limit);
              }}
              isPending={isPending}
              defaultValue={{ value: '1', label: '1' }}
              isClearable={false}
              error={errors.quantity_limit}
            />
          </FormGroup>

          <FormGroup>
            <StoreInputContainer
              itemForm={formState}
              itemFormErrors={errors}
              handleStoreChange={handleStoreChange}
              handleStoreRemove={handleStoreRemove}
              handleStoreAdd={handleStoreAdd}
            />
          </FormGroup>
        </div>

        <CancelSubmitButtons
          isPending={isPending}
          isEditing={!!item}
          type="Item"
        />
      </Form>
    </div>
  );
}
