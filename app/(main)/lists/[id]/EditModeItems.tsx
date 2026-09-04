'use client';

import Item from '@/app/(main)/items/ui/components/Item';
import { displayPrice } from '@/app/(main)/items/ui/components/itemFilters';
import ItemFormContainer from '@/app/(main)/items/ui/components/itemform/ItemFormContainer';
import ItemsToolbar from '@/app/(main)/items/ui/components/itemsToolbar';
import { Button } from '@/app/ui/components/button';
import { CheckboxField } from '@/app/ui/components/field/CheckboxField';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay, ListTable, ProfileMembershipView } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import {
  collectStoreOptions,
  filterAndSortEditModeItems,
  parseEditModeFilters,
} from './editModeFilters';

export default function EditModeItems({
  items,
  selected,
  initialSelected,
  onToggle,
  actor,
  lists,
  actingAs,
}: {
  items: ItemDisplay[];
  selected: ReadonlySet<string>;
  initialSelected: ReadonlySet<string>;
  onToggle: (itemId: string) => void;
  actor: ProfileMembershipView;
  lists: ListTable[];
  actingAs?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showNewItem, setShowNewItem] = useState(false);

  const filters = parseEditModeFilters(searchParams);
  const { q, show, selectedStores, hasPriceFilter } = filters;

  const storeOptions = useMemo(() => collectStoreOptions(items), [items]);
  const hasAnyPrice = useMemo(
    () => items.some((item) => Number.isFinite(displayPrice(item))),
    [items]
  );

  const selectedStoresKey = selectedStores.join('|');

  const filtered = useMemo(
    () => filterAndSortEditModeItems(items, selected, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filters` is rebuilt each render from `searchParams`; depend on its primitive projections (with `selectedStores` via `selectedStoresKey`) to keep the deps array stable
    [
      items,
      selected,
      show,
      q,
      selectedStoresKey,
      hasPriceFilter,
      filters.priceMin,
      filters.priceMax,
      filters.sort,
    ]
  );

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString());
    for (const key of [
      'q',
      'sort',
      'show',
      'store',
      'price_min',
      'price_max',
    ]) {
      params.delete(key);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const newItemButton = (
    <Button variant="primary" onClick={() => setShowNewItem(true)}>
      <FaPlus size={12} />
      {getMessage('edit_mode_create_item_label')}
    </Button>
  );

  return (
    <>
      {items.length === 0 ? (
        <div className="empty-container">
          <h3>{getMessage('edit_mode_library_empty_title')}</h3>
          <p>{getMessage('edit_mode_library_empty_body')}</p>
          {newItemButton}
        </div>
      ) : (
        <>
          <ItemsToolbar
            mode="choose"
            storeOptions={storeOptions}
            showStoreSort={storeOptions.length > 0}
            showPriceSort={hasAnyPrice}
            showPriceFilter={hasAnyPrice}
            showGridToggle={false}
          />
          <div className="list-edit-items-actions">{newItemButton}</div>
          {filtered.length === 0 ? (
            <div className="items-empty-filtered">
              <p>{getMessage('edit_mode_no_matches')}</p>
              <Button variant="secondary" onClick={clearFilters}>
                {getMessage('edit_mode_no_matches_clear_label')}
              </Button>
            </div>
          ) : (
            <ul className="edit-mode-list item-list" role="list">
              {filtered.map((item) => {
                const isSelected = selected.has(item.id);
                const removing = initialSelected.has(item.id) && !isSelected;
                const checkboxId = `edit-mode-item-${item.id}`;
                return (
                  <li key={item.id}>
                    <label
                      htmlFor={checkboxId}
                      className={`edit-mode-row${isSelected ? ' is-on' : ''}${
                        removing ? ' is-removing' : ''
                      }`}
                    >
                      <CheckboxField
                        id={checkboxId}
                        label={item.name ?? ''}
                        checked={isSelected}
                        onChange={() => onToggle(item.id)}
                      />
                      <Item item={item} actor={actor} preview />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {showNewItem && (
        <ItemFormContainer
          lists={lists}
          actingAs={actingAs}
          onClose={() => setShowNewItem(false)}
          onSuccess={() => setShowNewItem(false)}
        />
      )}
    </>
  );
}
