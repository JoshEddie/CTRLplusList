import { PriceField, TextField } from '@/app/ui/components/field';
import { ItemDetails } from '@/lib/types';

interface ItemFormErrors {
  name: string;
  image_url: string;
  quantity_limit: string;
  stores: {
    name: string;
    link: string;
    price: string;
  }[];
}

export function StoreInputContainer({
  itemForm,
  itemFormErrors,
  handleStoreChange,
  handleStoreAdd,
  handleStoreRemove,
}: {
  itemForm: ItemDetails;
  itemFormErrors: ItemFormErrors;
  handleStoreChange: (
    index: number,
    value: string | number,
    type: 'name' | 'price' | 'link'
  ) => void;
  handleStoreAdd: (index: number) => void;
  handleStoreRemove: (index: number) => void;
}) {
  const removable = itemForm.stores.length > 1;
  return (
    <div className={`if-stores${removable ? '' : ' if-stores-single'}`}>
      {itemForm.stores.length > 0 && (
        <div className="if-store-hd">
          <span>Store</span>
          <span>Price</span>
          <span>Link</span>
          {removable && <span aria-hidden="true" />}
        </div>
      )}
      {itemForm.stores.map((store, index) => {
        const err = itemFormErrors.stores[index];
        const parsedPrice = store.price ? parseFloat(String(store.price)) : NaN;
        const priceAmount = Number.isFinite(parsedPrice) ? parsedPrice : null;
        return (
          <div key={index} className="if-store-row">
            <TextField
              aria-label={`Store ${index + 1} name`}
              error={err?.name || undefined}
              placeholder="Store name"
              value={store.name || ''}
              onChange={(e) => handleStoreChange(index, e.target.value, 'name')}
              autoComplete="off"
            />
            <PriceField
              aria-label={`Store ${index + 1} price`}
              error={err?.price || undefined}
              amount={priceAmount}
              onChange={(v) => handleStoreChange(index, v.toFixed(2), 'price')}
            />
            <TextField
              aria-label={`Store ${index + 1} link`}
              error={err?.link || undefined}
              type="url"
              placeholder="https://..."
              value={store.link || ''}
              onChange={(e) => handleStoreChange(index, e.target.value, 'link')}
              autoComplete="off"
            />
            {removable && (
              <button
                className="if-store-rm"
                onClick={() => handleStoreRemove(index)}
                type="button"
                title="Remove store"
                aria-label={`Remove store ${index + 1}`}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="if-add-store"
        onClick={() => handleStoreAdd(itemForm.stores.length)}
      >
        + Add Store
      </button>
    </div>
  );
}
