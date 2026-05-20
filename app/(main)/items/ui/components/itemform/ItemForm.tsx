// ItemForm.tsx
'use client';

import {
  FormGroup,
  FormLabel,
  FormTextarea,
} from '@/app/ui/components/Form/Form';
import { FormShell, FormShellFooter } from '@/app/ui/components/FormShell';
import {
  ItemDetails,
  ItemStoreTable,
  ItemTable,
  ListTable,
  OptionType,
} from '@/lib/types';
import { useMemo } from 'react';
import DeleteItemButton from '../DeleteItemButton';
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
  } = useItemForm(item, user_id, returnTo, onSuccess);

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

  const previewCard = <ItemPreviewCard form={formState} />;

  const sections = (
    <>
      <Section label="DETAILS">
        <ItemNameInput
          value={formState.name}
          error={errors.name}
          onChange={handleNameChange}
          disabled={isPending}
        />
        <FormGroup>
          <FormLabel>Description</FormLabel>
          <FormTextarea
            value={formState.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            disabled={isPending}
            placeholder="Add a description... (optional)"
            rows={2}
          />
        </FormGroup>
      </Section>

      <Section label="IMAGE">
        <FormGroup>
          <FormLabel>URL</FormLabel>
          <ImageUrlInput
            value={formState.image_url}
            error={errors.image_url}
            onChange={handleImageUrlChange}
            disabled={isPending}
          />
        </FormGroup>
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
        <QuantityLimitSelect
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
                userId={user_id}
                returnTo={returnTo}
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

function ItemPreviewCard({ form }: { form: ItemDetails }) {
  const stores = form.stores || [];
  const firstStore = stores.find((s) => s.name);
  const rawPrice = firstStore?.price ? parseFloat(String(firstStore.price)) : NaN;
  const price = Number.isFinite(rawPrice) ? rawPrice : null;
  const storeCount = stores.filter((s) => s.name).length;

  return (
    <div className="if-prev-full">
      <div className="if-prev-full-img">
        {form.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.image_url}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="if-prev-full-ph" aria-hidden="true">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle
                cx="8.5"
                cy="8.5"
                r="1.5"
                fill="currentColor"
                stroke="none"
              />
              <path d="M21 15l-5-5L5 21" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="if-prev-full-body">
        <div className="if-prev-full-name">
          {form.name || <span className="if-prev-full-name-ph">Item Name</span>}
        </div>
        {firstStore?.name && (
          <div className="if-prev-from">
            FROM {firstStore.name.toUpperCase()}
          </div>
        )}
        <div className="if-prev-btm">
          {price !== null && (
            <span className="if-prev-price">${price.toFixed(2)}</span>
          )}
          {firstStore?.name && (
            <span className="if-prev-chip">{firstStore.name}</span>
          )}
          {storeCount > 1 && (
            <span className="if-prev-more">+{storeCount - 1}</span>
          )}
        </div>
      </div>
    </div>
  );
}
