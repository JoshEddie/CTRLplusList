'use client';

import FieldRow from './FieldRow';
import type { RowField } from './focus';
import { isLinkless, rowTiers } from './utils';
import type { ItemViewModel } from './viewModel';

interface FieldRowsProps {
  item: ItemViewModel;
  onFocus: (field: RowField) => void;
}

export function FieldRows({ item, onFocus }: FieldRowsProps) {
  const store = item.store;
  const tiers = rowTiers(item);

  return (
    <div className="deck-triage-rows">
      <FieldRow
        label="Photo"
        value={item.photos.length ? `${item.photos.length} found` : 'None'}
        status={tiers.photo}
        onClick={() => onFocus('photo')}
      />
      <FieldRow
        label="Item name"
        value={item.name || 'None'}
        status={tiers.name}
        onClick={() => onFocus('name')}
      />
      <FieldRow
        label="Note"
        value={item.description || 'Optional — none yet'}
        status={tiers.note}
        onClick={() => onFocus('note')}
      />
      <FieldRow
        label="Price"
        value={store?.price ? `$${store.price.replace(/^\$/, '')}` : 'Not set'}
        provenance={store?.price_fetched_at ? 'from fetch' : undefined}
        status={tiers.price}
        onClick={() => onFocus('price')}
      />
      {!isLinkless(item) && (
        <FieldRow
          label="Store"
          value={store?.name || 'None'}
          provenance={store?.link ? 'saved from link' : undefined}
          status={tiers.store}
          onClick={() => onFocus('store')}
        />
      )}
    </div>
  );
}
