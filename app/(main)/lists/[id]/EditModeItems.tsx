'use client';

import ItemFormContainer from '@/app/(main)/items/ui/components/itemform/ItemFormContainer';
import ToolbarSlot from '@/app/(main)/items/ui/components/itemsToolbar/ToolbarSlot';
import { Button } from '@/app/ui/components/button';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay, ListTable } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import type { StagedEntry } from './editModeChanges';
import {
  hasEditModeFilter,
  parseEditModeFilters,
  partitionEditModeItems,
} from './editModeFilters';
import EditModeInList from './EditModeInList';
import EditModeNotInList from './EditModeNotInList';
import EditModeQuantitySheet from './EditModeQuantitySheet';

export default function EditModeItems({
  items,
  entries,
  pending,
  onQuantityChange,
  onReorder,
  lists,
  actingAs,
}: {
  items: ItemDisplay[];
  entries: StagedEntry[];
  pending: ReadonlySet<string>;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onReorder: (activeId: string, overId: string) => void;
  lists: ListTable[];
  actingAs?: string;
}) {
  const searchParams = useSearchParams();
  const [showNewItem, setShowNewItem] = useState(false);
  // The row whose sheet is open, held as the item so the sheet keeps rendering
  // an item a filter has since dropped out from under it.
  const [sheetItem, setSheetItem] = useState<ItemDisplay | null>(null);

  const quantities = useMemo(
    () => new Map(entries.map((entry) => [entry.item_id, entry.quantity])),
    [entries]
  );
  const quantityOf = (itemId: string) => quantities.get(itemId) ?? 0;

  const filters = parseEditModeFilters(searchParams);
  const filtered = hasEditModeFilter(filters);
  const { q, selectedStores, hasPriceFilter, priceMin, priceMax } = filters;

  const selectedStoresKey = selectedStores.join('|');

  const partition = useMemo(
    () => partitionEditModeItems(items, entries, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filters` is rebuilt each render from `searchParams`; depend on its primitive projections (with `selectedStores` via `selectedStoresKey`) to keep the deps array stable
    [items, entries, q, selectedStoresKey, hasPriceFilter, priceMin, priceMax]
  );

  // The item write is real; its membership here is staged like any other
  // add. The row itself arrives with the refresh the form triggers.
  const handleCreated = (id?: string) => {
    setShowNewItem(false);
    if (id) onQuantityChange(id, 1);
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
          {/* Portals into the hero chrome's slot, so it pins with the band
              exactly as the list page's toolbar does. */}
          <ToolbarSlot items={items} mode="edit" showGridToggle={false} />
          <EditModeInList
            rows={partition.inList}
            total={partition.inListTotal}
            filtered={filtered}
            quantityOf={quantityOf}
            pending={pending}
            onQuantityChange={onQuantityChange}
            onOpen={setSheetItem}
            onReorder={onReorder}
          />
          <EditModeNotInList
            rows={partition.notInList}
            total={partition.notInListTotal}
            filtered={filtered}
            pending={pending}
            onQuantityChange={onQuantityChange}
            onOpen={setSheetItem}
            onCreate={() => setShowNewItem(true)}
          />
        </>
      )}
      {sheetItem && (
        <EditModeQuantitySheet
          item={sheetItem}
          quantity={quantityOf(sheetItem.id)}
          onQuantityChange={onQuantityChange}
          onClose={() => setSheetItem(null)}
        />
      )}
      {showNewItem && (
        <ItemFormContainer
          lists={lists}
          actingAs={actingAs}
          onClose={() => setShowNewItem(false)}
          onSuccess={handleCreated}
        />
      )}
    </>
  );
}
