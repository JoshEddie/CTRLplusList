'use client';

import { setListItems } from '@/app/actions/lists';
import {
  compareItems,
  firstStorePrice,
} from '@/app/(main)/items/ui/components/itemFilters';
import ItemFormContainer from '@/app/(main)/items/ui/components/itemform/ItemFormContainer';
import ItemsToolbar from '@/app/(main)/items/ui/components/ItemsToolbar';
import Header from '@/app/ui/components/Header';
import { ItemDisplay, ListTable, SortKey } from '@/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaPlus } from 'react-icons/fa';

type ItemRow = ItemDisplay;

const VALID_SORT_CHOOSE: SortKey[] = [
  'created_desc',
  'created_asc',
  'name_asc',
  'name_desc',
  'store_asc',
  'store_desc',
  'price_asc',
  'price_desc',
];

type ShowFilter = 'all' | 'on' | 'off';

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

  const q = (searchParams?.get('q') ?? '').toLowerCase().trim();
  const rawSort = searchParams?.get('sort') as SortKey | null;
  const sort: SortKey =
    rawSort && VALID_SORT_CHOOSE.includes(rawSort) ? rawSort : 'created_desc';
  const rawShow = searchParams?.get('show');
  const show: ShowFilter =
    rawShow === 'on' || rawShow === 'off' ? rawShow : 'all';
  const selectedStores = searchParams?.getAll('store') ?? [];
  const priceMin = parseFloat(searchParams?.get('price_min') ?? '');
  const priceMax = parseFloat(searchParams?.get('price_max') ?? '');
  const hasPriceFilter = Number.isFinite(priceMin) || Number.isFinite(priceMax);

  const storeOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      for (const store of item.stores ?? []) {
        if (store.name) names.add(store.name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const hasAnyStore = storeOptions.length > 0;
  const hasAnyPrice = useMemo(
    () => items.some((item) => Number.isFinite(firstStorePrice(item))),
    [items]
  );

  const filtered = useMemo(() => {
    let result = items;
    if (show === 'on') {
      result = result.filter((item) => initialSet.has(item.id));
    } else if (show === 'off') {
      result = result.filter((item) => !initialSet.has(item.id));
    }
    if (q) {
      result = result.filter((item) =>
        `${item.name ?? ''} ${item.description ?? ''}`
          .toLowerCase()
          .includes(q)
      );
    }
    if (selectedStores.length > 0) {
      const selectedSet = new Set(selectedStores);
      result = result.filter((item) =>
        item.stores?.some((s) => selectedSet.has(s.name))
      );
    }
    if (hasPriceFilter) {
      const lo = Number.isFinite(priceMin) ? priceMin : -Infinity;
      const hi = Number.isFinite(priceMax) ? priceMax : Infinity;
      result = result.filter((item) => {
        const p = firstStorePrice(item);
        return Number.isFinite(p) && p >= lo && p <= hi;
      });
    }
    return [...result].sort((a, b) => compareItems(a, b, sort));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    initialSet,
    show,
    q,
    selectedStores.join('|'),
    hasPriceFilter,
    priceMin,
    priceMax,
    sort,
  ]);

  const hasActiveFilters =
    q.length > 0 ||
    show !== 'all' ||
    selectedStores.length > 0 ||
    hasPriceFilter;

  const hasChanges = useMemo(() => {
    if (selected.size !== initialSet.size) return true;
    for (const id of selected) {
      if (!initialSet.has(id)) return true;
    }
    return false;
  }, [selected, initialSet]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    if (!hasChanges || isSubmitting) return;
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

  return (
    <div className="choose-items-page">
      <Header title={`Choose items for "${list_name}"`}>
        <button
          type="button"
          className="btn secondary"
          onClick={() => setShowNewItem(true)}
        >
          <FaPlus size={14} />
          <span className="mobile-hide">Create new item</span>
        </button>
      </Header>

      {items.length === 0 ? (
        <div className="empty-container">
          <h3>No items in your library yet</h3>
          <p>
            Create items first, then come back here to add them to{' '}
            <strong>{list_name}</strong>.
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => setShowNewItem(true)}
          >
            <FaPlus size={14} />
            Create Item
          </button>
        </div>
      ) : (
        <>
          <ItemsToolbar
            mode="choose"
            storeOptions={storeOptions}
            showStoreSort={hasAnyStore}
            showPriceSort={hasAnyPrice}
            showPriceFilter={hasAnyPrice}
          />
          {filtered.length === 0 ? (
            hasActiveFilters ? (
              <div className="items-empty-filtered">
                <p>No items match your filters.</p>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="items-empty-filtered">
                <p>No items in your library yet.</p>
              </div>
            )
          ) : (
            <ul className="choose-items-list">
              {filtered.map((item) => {
                const isSelected = selected.has(item.id);
                const isArchived = !!item.archived_at;
                return (
                  <li
                    key={item.id}
                    className={`choose-items-row ${isSelected ? 'selected' : ''}`}
                  >
                    <label className="choose-items-label">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(item.id)}
                      />
                      {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name || ''}
                          className="choose-items-thumb"
                        />
                      )}
                      <div className="choose-items-text">
                        <span className="choose-items-name">
                          {item.name}
                          {isArchived && (
                            <span className="choose-items-archived-badge">
                              archived
                            </span>
                          )}
                        </span>
                        {item.description && (
                          <span className="choose-items-description">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <div className="choose-items-actions">
        <button
          type="button"
          className="btn secondary"
          onClick={handleBack}
          disabled={isSubmitting}
        >
          {isNew ? 'Skip for now' : 'Back to list'}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={handleSubmit}
          disabled={!hasChanges || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save changes'}
        </button>
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
