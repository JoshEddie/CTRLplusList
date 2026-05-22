// ItemForm.tsx
'use client';

import { TextareaField } from '@/app/ui/components/field';
import { FormShell, FormShellFooter } from '@/app/ui/components/FormShell';
import {
  ItemDisplay,
  ItemStoreTable,
  ItemTable,
  ListTable,
  OptionType,
} from '@/lib/types';
import { useMemo } from 'react';
import DeleteItemButton from '../DeleteItemButton';
import Item from '../Item';
import { ImageUrlInput } from './ImageUrlInput';
import { ItemNameInput } from './ItemNameInput';
import { ListSelection } from './ListSelection';
import { QuantityLimitField } from './QuantityLimitField';
import { StoreInputContainer } from './StoreInput';
import { useItemForm } from './useItemForm';

interface ItemFormProps {
  item?: ItemTable & {
    stores: ItemStoreTable[];
    lists: ListTable[];
  };
  lists?: ListTable[];
  user_id: string;
  returnTo?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function ItemForm({
  item,
  lists,
  user_id,
  returnTo,
  onSuccess,
  onClose,
}: ItemFormProps) {
  const {
    formState,
    errors,
    isPending,
    handleNameChange,
    handleDescriptionChange,
    handleImageUrlChange,
    handleListChange,
    handleQuantityLimitChange,
    handleStoreChange,
    handleStoreAdd,
    handleStoreRemove,
    handleSubmit,
  } = useItemForm(item, returnTo, onSuccess);

  const listOptions: OptionType[] = useMemo(() => {
    if (!lists) return [];
    return lists.map((list) => ({
      value: list.id.toString(),
      label: list.name,
    }));
  }, [lists]);

  const isEditing = !!item;
  const closeHref = returnTo ?? '/items';
  const title = isEditing ? `Edit ${item.name || 'Item'}` : 'New Item';

  // Live preview renders the real <Item> card in preview mode (no modal,
  // pointer-events disabled). Map form state → ItemDisplay; the
  // never-rendered timestamp fields are stubbed. The preview's `user_id`
  // matches the viewer's so the card renders in owner mode (no claim CTA).
  const previewItem: ItemDisplay = {
    id: formState.id || 'preview',
    name: formState.name,
    description: formState.description,
    image_url: formState.image_url,
    quantity_limit: formState.quantity_limit,
    user_id: user_id,
    stores: formState.stores.filter((s) => s.name || s.price || s.link),
    purchases: [],
    created_at: new Date(),
    updated_at: new Date(),
  };
  const previewCard = (
    <Item item={previewItem} user_id={user_id} preview className="preview" />
  );

  const sections = (
    <>
      <Section label="DETAILS">
        <ItemNameInput
          value={formState.name}
          error={errors.name}
          onChange={handleNameChange}
          disabled={isPending}
        />
        <TextareaField
          label="Description"
          value={formState.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          disabled={isPending}
          placeholder="Add a description... (optional)"
          rows={2}
        />
      </Section>

      <Section label="IMAGE">
        <ImageUrlInput
          value={formState.image_url}
          error={errors.image_url}
          onChange={handleImageUrlChange}
          disabled={isPending}
        />
      </Section>

      <Section label="STORES & PRICES">
        <StoreInputContainer
          itemForm={formState}
          itemFormErrors={errors}
          handleStoreChange={handleStoreChange}
          handleStoreRemove={handleStoreRemove}
          handleStoreAdd={handleStoreAdd}
        />
      </Section>

      <Section label="ORGANIZE" last>
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
        <QuantityLimitField
          value={formState.quantity_limit}
          onChange={handleQuantityLimitChange}
          isPending={isPending}
          error={errors.quantity_limit}
        />
      </Section>
    </>
  );

  return (
    <FormShell
      variant="split"
      title={title}
      closeHref={onClose ? undefined : closeHref}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        {/* Desktop: split-pane (preview left, sections right). Mobile/narrow: preview strip + sections stacked. */}
        <div className="form-shell-split-body">
          <aside className="form-shell-split-left">
            <div className="form-shell-split-lbl">LIVE PREVIEW</div>
            {previewCard}
            <div className="form-shell-split-lists">
              <div className="form-shell-split-lbl">ON YOUR LISTS</div>
              {formState.lists && formState.lists.length > 0 ? (
                <div className="form-shell-split-list-chips">
                  {formState.lists.map((l) => (
                    <span key={l.value} className="form-shell-split-list-chip">
                      {l.label}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="form-shell-split-lists-empty">
                  No lists selected yet
                </div>
              )}
            </div>
          </aside>

          <div className="form-shell-split-right">{sections}</div>
        </div>

        <FormShellFooter
          cancelHref={onClose ? undefined : closeHref}
          onCancel={onClose}
          submitLabel={isEditing ? 'Update Item' : 'Create Item'}
          isPending={isPending}
          deleteSlot={
            isEditing && item ? (
              <DeleteItemButton
                id={item.id}
                returnTo={returnTo}
                onDeleted={onClose}
              />
            ) : undefined
          }
        />
      </form>
    </FormShell>
  );
}

function Section({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`if-sec${last ? ' if-sec-last' : ''}`}>
      <div className="if-sec-lbl">{label}</div>
      {children}
    </div>
  );
}
