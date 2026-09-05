'use client';

import {
  browseItems,
  parseSort,
} from '@/app/(main)/items/ui/components/itemFilters';
import ItemFormContainer from '@/app/(main)/items/ui/components/itemform/ItemFormContainer';
import { SORT_KEYS_BY_MODE } from '@/app/(main)/items/ui/components/itemsToolbar/toolbarConstants';
import Pagination from '@/app/(main)/items/ui/components/Pagination';
import { useItemsPageSize } from '@/app/(main)/items/ui/components/useItemsPageSize';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { setListItems } from '@/lib/data/listItems.actions';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay, ListTable } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import EditModeBand, { type EditModeTab } from './EditModeBand';
import {
  entryDiff,
  exitEditHref,
  inAppDestination,
  moveEntry,
  pendingChanges,
  setEntryQuantity,
  type StagedEntry,
} from './editModeChanges';
import EditModeFooter from './EditModeFooter';
import EditModeInList from './EditModeInList';
import EditModeLibrary from './EditModeLibrary';
import EditModeToolbar from './EditModeToolbar';

// `discard` is Cancel's and Back's; `leave` is an in-app link's, which carries
// the href the confirm then follows.
type Confirming = 'save' | 'discard' | 'leave' | null;

export default function EditModeForm({
  list,
  items,
  initialEntries,
  isNew,
  lists,
  actingAs,
  initialPageSize,
}: {
  list: ListTable;
  items: ItemDisplay[];
  /** The saved entries in position order — what every staged change is judged against. */
  initialEntries: StagedEntry[];
  isNew: boolean;
  lists: ListTable[];
  actingAs?: string;
  initialPageSize?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [entries, setEntries] = useState<StagedEntry[]>(initialEntries);
  // The rows whose drag is what put them where they are: a move displaces its
  // neighbours on screen, but only the dragged row's saved position changes.
  const [moved, setMoved] = useState<ReadonlySet<string>>(() => new Set());
  // Component state, not a search param: the page is already a `replace`, and
  // a back-navigable tab would compound the entry the dirty-exit guard pushes.
  // An empty list opens on the library: the only thing to do there is add.
  const [tab, setTab] = useState<EditModeTab>(
    isNew || initialEntries.length === 0 ? 'add' : 'list'
  );
  const [showNewItem, setShowNewItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [pageSize, setPageSize] = useItemsPageSize(initialPageSize);

  const { added, removed, requantified, reordered } = entryDiff(
    initialEntries,
    entries
  );
  const isDirty = added > 0 || removed > 0 || requantified > 0 || reordered;
  const pending = useMemo(
    () => pendingChanges(initialEntries, entries, moved),
    [initialEntries, entries, moved]
  );

  const exitHref = useMemo(
    () => exitEditHref(list.id, searchParams),
    [searchParams, list.id]
  );

  const library = useMemo(
    () =>
      browseItems(
        items,
        searchParams,
        parseSort(searchParams, SORT_KEYS_BY_MODE.edit, 'created_desc'),
        pageSize
      ),
    [items, searchParams, pageSize]
  );

  // Leaving the tab, reloading, or following a link off-site.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  // Back is the mode's own exit — `?edit=1` is a searchParam, so the entry that
  // opened the mode is one press away and `beforeunload` never fires for it.
  // `popstate` cannot be cancelled, so a duplicate entry pushed while dirty
  // absorbs that press: the mode is still mounted when it lands, and the
  // dialog decides whether to leave or re-arm. The spare entry outlives a
  // Save or Cancel, which costs one extra Back press afterwards and is the
  // whole price of asking before a staged edit is discarded.
  useEffect(() => {
    if (!isDirty) return;
    window.history.pushState(null, '');
    const onPopState = () => setConfirming('discard');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isDirty]);

  // An in-app link is a client-side navigation `beforeunload` never sees.
  // Caught in the capture phase so it runs ahead of the link's own handler,
  // which honours the cancelled default.
  useEffect(() => {
    if (!isDirty) return;
    const onClick = (event: MouseEvent) => {
      const href = inAppDestination(event);
      if (href === null) return;
      event.preventDefault();
      setLeaveHref(href);
      setConfirming('leave');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isDirty]);

  const exit = (href: string = exitHref) => {
    router.push(href);
    router.refresh();
  };

  const setQuantity = (itemId: string, quantity: number) => {
    setEntries((prev) =>
      setEntryQuantity(prev, initialEntries, itemId, quantity)
    );
    // Putting a removed row back is not a move: its mark clears with it.
    if (quantity > 0)
      setMoved((prev) => {
        if (!prev.has(itemId) || entries.some((e) => e.item_id === itemId))
          return prev;
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
  };

  const reorder = (activeId: string, overId: string) => {
    const next = moveEntry(entries, activeId, overId);
    setEntries(next);
    setMoved((prev) =>
      entryDiff(initialEntries, next).reordered
        ? new Set(prev).add(activeId)
        : new Set()
    );
  };

  // The item write is real; its membership here is staged like any other
  // add. The card itself arrives with the refresh the form triggers.
  const handleCreated = (id?: string) => {
    setShowNewItem(false);
    if (id) setQuantity(id, 1);
  };

  const save = async () => {
    setIsSubmitting(true);
    try {
      await toast.promise(
        setListItems(list.id, entries).then((result) => {
          if (!result.success) throw new Error(result.message);
        }),
        {
          loading: getMessage('edit_mode_save_loading'),
          success: getMessage('edit_mode_save_success'),
          error: (err: Error) =>
            err.message || getMessage('edit_mode_save_error'),
        }
      );
      exit();
    } catch {
      // toast.promise has already surfaced the failure; the staged edit stays
      // on screen so the owner can correct it rather than lose it.
    } finally {
      setIsSubmitting(false);
    }
  };

  // Both confirms are the price bulk Save takes on, and the create fork buys no
  // exemption from them — it changes the labels only. A pristine mode has
  // nothing to confirm either way, so it just leaves.
  const handleSave = () => {
    if (isDirty) setConfirming('save');
    else exit();
  };

  const handleCancel = () => {
    if (isDirty) setConfirming('discard');
    else exit();
  };

  // Dismissing the discard dialog re-arms the Back guard, whose entry the press
  // that opened it consumed.
  const dismissConfirm = () => {
    if (confirming === 'discard' && isDirty) window.history.pushState(null, '');
    setConfirming(null);
    setLeaveHref(null);
  };

  const confirmDiscard = () => {
    exit(confirming === 'leave' && leaveHref ? leaveHref : exitHref);
  };

  return (
    <>
      <EditModeBand
        title={list.name}
        tab={tab}
        onTabChange={setTab}
        inListCount={entries.length}
        onCreate={() => setShowNewItem(true)}
      >
        {tab === 'add' && items.length > 0 && <EditModeToolbar items={items} />}
      </EditModeBand>
      {tab === 'list' ? (
        <EditModeInList
          items={items}
          saved={initialEntries}
          entries={entries}
          moved={moved}
          onQuantityChange={setQuantity}
          onReorder={reorder}
        />
      ) : (
        <EditModeLibrary
          items={items}
          rows={library.rows}
          saved={initialEntries}
          entries={entries}
          onQuantityChange={setQuantity}
          onCreate={() => setShowNewItem(true)}
        />
      )}
      <EditModeFooter
        changeCount={pending.size}
        pager={
          tab === 'add' && items.length > 0 ? (
            <Pagination
              page={library.page}
              totalPages={library.totalPages}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          ) : undefined
        }
        totalSelected={entries.length}
        isNew={isNew}
        canSave={isDirty || isNew}
        isSubmitting={isSubmitting}
        onCancel={handleCancel}
        onSave={handleSave}
      />
      {showNewItem && (
        <ItemFormContainer
          lists={lists}
          actingAs={actingAs}
          onClose={() => setShowNewItem(false)}
          onSuccess={handleCreated}
        />
      )}
      <ConfirmDialog
        isOpen={confirming === 'save'}
        onClose={dismissConfirm}
        onConfirm={save}
        title={getMessage('edit_mode_save_confirm_title')}
        message={getMessage('edit_mode_save_confirm_message', {
          added,
          removed,
        })}
        confirmText={getMessage('edit_mode_save_confirm_label')}
        cancelText={getMessage('edit_mode_confirm_dismiss_label')}
        confirmVariant="primary"
      />
      <ConfirmDialog
        isOpen={confirming === 'discard' || confirming === 'leave'}
        onClose={dismissConfirm}
        onConfirm={confirmDiscard}
        title={getMessage('edit_mode_cancel_confirm_title')}
        message={getMessage('edit_mode_cancel_confirm_message')}
        confirmText={getMessage('edit_mode_discard_confirm_label')}
        cancelText={getMessage('edit_mode_confirm_dismiss_label')}
      />
    </>
  );
}
