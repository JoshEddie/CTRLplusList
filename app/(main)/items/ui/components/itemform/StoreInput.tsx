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
        return (
          <div key={index} className="if-store-row">
            <input
              className={`form-input ${err?.name ? 'form-input-error' : ''}`}
              placeholder="Store name"
              value={store.name || ''}
              onChange={(e) => handleStoreChange(index, e.target.value, 'name')}
              autoComplete="off"
            />
            <div className="if-price-wrap">
              <span className="if-dollar">$</span>
              <input
                className={`form-input if-price-in ${err?.price ? 'form-input-error' : ''}`}
                inputMode="decimal"
                placeholder="0.00"
                value={store.price || ''}
                onChange={(e) =>
                  handleStoreChange(index, e.target.value, 'price')
                }
                autoComplete="off"
              />
            </div>
            <input
              className={`form-input ${err?.link ? 'form-input-error' : ''}`}
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
