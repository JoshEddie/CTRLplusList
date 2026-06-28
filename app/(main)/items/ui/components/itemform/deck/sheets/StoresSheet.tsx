'use client';

import { Button } from '@/app/ui/components/button';
import { PriceField, TextField } from '@/app/ui/components/field';
import { FaTrash } from 'react-icons/fa6';
import { isValidProductUrl } from '../../utils';
import { TierNote } from '../TierNote';
import type { ItemActions } from '../useItemActions';
import { amountToPrice, priceTier, priceToAmount } from '../utils';
import type { DeckStore, ItemViewModel } from '../viewModel';

// A row is incomplete when it's partly filled but doesn't satisfy the
// all-or-nothing store rule (name + link + numeric price) from item-store-links.
function rowIncomplete(store: DeckStore): boolean {
  const hasAny = !!(store.name.trim() || store.link.trim() || store.price.trim());
  if (!hasAny) return false;
  const complete =
    store.name.trim() &&
    isValidProductUrl(store.link) &&
    priceTier(store.price).tier === 'good';
  return !complete;
}

interface StoresSheetProps {
  item: ItemViewModel;
  actions: ItemActions;
}

export function StoresSheet({ item, actions }: StoresSheetProps) {
  return (
    <div className="deck-stores">
      {item.stores.map((store, i) => (
        <div key={i} className="deck-store-row">
          <div className="deck-store-head">
            <span className="deck-store-num">
              {i === 0 ? 'Primary store' : `Store ${i + 1}`}
            </span>
            {item.stores.length > 1 && (
              <button
                type="button"
                className="deck-store-rm"
                onClick={() => actions.removeStore(i)}
                aria-label={`Remove store ${i + 1}`}
              >
                <FaTrash aria-hidden="true" />
              </button>
            )}
          </div>
          <TextField
            label="Store name"
            value={store.name}
            onChange={(e) => actions.setStore(i, 'name', e.target.value)}
            placeholder="e.g. Amazon"
          />
          <TextField
            type="url"
            label="Link"
            value={store.link}
            onChange={(e) => actions.setStore(i, 'link', e.target.value)}
            placeholder="https://…"
          />
          <PriceField
            label="Price"
            amount={priceToAmount(store.price)}
            onChange={(value) => actions.setStore(i, 'price', amountToPrice(value))}
          />
          {rowIncomplete(store) && (
            <TierNote tier="error">
              A store needs a name, a link, and a price — or leave all three
              blank.
            </TierNote>
          )}
        </div>
      ))}
      <Button variant="secondary" onClick={actions.addStore}>
        Add another store
      </Button>
    </div>
  );
}
