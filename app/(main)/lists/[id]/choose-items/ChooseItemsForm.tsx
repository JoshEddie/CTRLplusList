'use client';

import Item from '@/app/(main)/items/ui/components/Item';
import { displayPrice } from '@/app/(main)/items/ui/components/itemFilters';
import ItemFormContainer from '@/app/(main)/items/ui/components/itemform/ItemFormContainer';
import ItemsToolbar from '@/app/(main)/items/ui/components/itemsToolbar';
import { setListItems } from '@/app/actions/lists';
import { Button, LinkButton } from '@/app/ui/components/button';
import { CheckboxField } from '@/app/ui/components/field/CheckboxField';
import { ItemDisplay, ListTable } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaPlus } from 'react-icons/fa';
import { FaArrowLeftLong, FaArrowRightLong } from 'react-icons/fa6';
import {
  chooseItemsSaveLabel,
  collectStoreOptions,
  filterAndSortChooseItems,
  parseChooseItemsFilters,
} from './utils';

type ItemRow = ItemDisplay;

export default function ChooseItemsForm({
  list_id,
  list_name,
  items,
  initialSelectedIds,
  isNew = false,
  user_id,
  lists,
}: {
  list_id: string;
  list_name: string;
  items: ItemRow[];
  initialSelectedIds: string[];
  isNew?: boolean;
  user_id: string;
  lists: ListTable[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialSet = useMemo(
    () => new Set(initialSelectedIds),
    [initialSelectedIds]
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);

  const filters = parseChooseItemsFilters(searchParams);
  const { q, show, selectedStores, hasPriceFilter } = filters;

  const storeOptions = useMemo(() => collectStoreOptions(items), [items]);

  const hasAnyStore = storeOptions.length > 0;
  const hasAnyPrice = useMemo(
    () => items.some((item) => Number.isFinite(displayPrice(item))),
    [items]
  );

  const selectedStoresKey = selectedStores.join('|');

  const filtered = useMemo(
    () => filterAndSortChooseItems(items, selected, filters),
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

  const hasActiveFilters =
    q.length > 0 ||
    show !== 'all' ||
    selectedStores.length > 0 ||
    hasPriceFilter;

  const addedCount = useMemo(() => {
    let n = 0;
    for (const id of selected) if (!initialSet.has(id)) n++;
    return n;
  }, [selected, initialSet]);

  const removedCount = useMemo(() => {
    let n = 0;
    for (const id of initialSet) if (!selected.has(id)) n++;
    return n;
  }, [selected, initialSet]);

  const hasChanges = addedCount > 0 || removedCount > 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const undoAll = () => setSelected(new Set(initialSet));

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('q');
    params.delete('sort');
    params.delete('show');
    params.delete('store');
    params.delete('price_min');
    params.delete('price_max');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleSubmit = async () => {
    if (!hasChanges || isSubmitting) {
      if (isNew) router.push(`/lists/${list_id}`);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await toast.promise(
        setListItems(list_id, Array.from(selected)),
        {
          loading: 'Saving changes',
          success: (r) => r.message || 'Saved',
          error: 'Failed to save changes',
        }
      );
      if (result.success) {
        router.push(`/lists/${list_id}`);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push(`/lists/${list_id}`);
  };

  const totalSelected = selected.size;
  const mode: 'create' | 'manage' = isNew ? 'create' : 'manage';
  const saveLabel = chooseItemsSaveLabel(mode, totalSelected);

  return (
    <div className="choose-items-page">
      <div className="choose-items-pg-hd">
        <LinkButton
          href={isNew ? '/lists' : `/lists/${list_id}`}
          // className="choose-items-back"
          variant="secondary"
        >
          <FaArrowLeftLong />
          <span className="mobile-hide">
            {isNew ? 'Back to Lists' : 'Back to list'}
          </span>
        </LinkButton>
        <Button variant="primary" onClick={() => setShowNewItem(true)}>
          <FaPlus size={12} />
          <span className="mobile-hide">Create new item</span>
        </Button>
        <div className="choose-items-pg-hd-main">
          <h1 className="choose-items-pg-title">
            Choose items for <em>&ldquo;{list_name}&rdquo;</em>
          </h1>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-container">
          <h3>No items in your library yet</h3>
          <p>
            Create items first, then come back here to add them to{' '}
            <strong>{list_name}</strong>.
          </p>
          <Button variant="primary" onClick={() => setShowNewItem(true)}>
            <FaPlus size={14} />
            Create Item
          </Button>
        </div>
      ) : (
        <>
          <ItemsToolbar
            mode="choose"
            storeOptions={storeOptions}
            showStoreSort={hasAnyStore}
            showPriceSort={hasAnyPrice}
            showPriceFilter={hasAnyPrice}
            showGridToggle={false}
          />
          {filtered.length === 0 ? (
            hasActiveFilters ? (
              <div className="items-empty-filtered">
                <p>No items match your filters.</p>
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="items-empty-filtered">
                <p>No items in your library yet.</p>
              </div>
            )
          ) : (
            <ul className="choose-items-list item-list" role="list">
              {filtered.map((item) => {
                const isSelected = selected.has(item.id);
                const wasIn = initialSet.has(item.id);
                const removing = wasIn && !isSelected;
                const checkboxId = `choose-item-${item.id}`;
                return (
                  <li key={item.id}>
                    <label
                      htmlFor={checkboxId}
                      className={`choose-items-select${isSelected ? ' is-on' : ''}${
                        removing ? ' is-removing' : ''
                      }`}
                    >
                      <CheckboxField
                        id={checkboxId}
                        label={item.name ?? ''}
                        checked={isSelected}
                        onChange={() => toggle(item.id)}
                      />
                      <Item item={item} user_id={user_id} preview />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <div className="choose-items-sticky-ft">
        <div className="choose-items-count">
          {totalSelected > 0 ? (
            <>
              {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
            </>
          ) : (
            <span className="choose-items-count-muted">No items selected</span>
          )}
          {mode === 'manage' && hasChanges && (
            <span className="choose-items-count-diff">
              {addedCount > 0 && (
                <>
                  {' · '}
                  <span className="choose-items-count-added">
                    +{addedCount} added
                  </span>
                </>
              )}
              {removedCount > 0 && (
                <>
                  {' · '}
                  <span className="choose-items-count-removed">
                    −{removedCount} removed
                  </span>
                </>
              )}
              {' · '}
              <button
                type="button"
                className="choose-items-undo"
                onClick={undoAll}
              >
                Undo
              </button>
            </span>
          )}
        </div>
        <div className="choose-items-sticky-actions">
          <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
            {isNew ? 'Skip' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!hasChanges && !isNew}
            isLoading={isSubmitting}
          >
            {saveLabel} <FaArrowRightLong />
          </Button>
        </div>
      </div>

      {showNewItem && (
        <ItemFormContainer
          lists={lists}
          user_id={user_id}
          onClose={() => setShowNewItem(false)}
          onSuccess={() => setShowNewItem(false)}
        />
      )}
    </div>
  );
}
