'use client';

import {
  dateFieldError,
  dateInputValue,
} from '@/app/(main)/lists/ui/components/utils';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { updateList } from '@/lib/data/list.actions';
import { setListItems } from '@/lib/data/listItems.actions';
import { getMessage } from '@/lib/i18n/utils';
import { ItemDisplay, ListTable, ProfileMembershipView } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import EditModeFooter from './EditModeFooter';
import EditModeHeader from './EditModeHeader';
import EditModeItems from './EditModeItems';
import {
  detailsChanged,
  entryDiff,
  exitEditHref,
  type ListDetailsDraft,
} from './editModeChanges';

type Confirming = 'save' | 'discard' | null;

export default function EditModeForm({
  list,
  items,
  initialSelectedIds,
  isNew,
  actor,
  lists,
  actingAs,
}: {
  list: ListTable;
  items: ItemDisplay[];
  initialSelectedIds: string[];
  isNew: boolean;
  actor: ProfileMembershipView;
  lists: ListTable[];
  actingAs?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSelected = useMemo(
    () => new Set(initialSelectedIds),
    [initialSelectedIds]
  );
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );
  const [draft, setDraft] = useState<ListDetailsDraft>(() => ({
    name: list.name,
    subtitle: list.subtitle ?? '',
    occasion: list.occasion,
    date: dateInputValue(list.date),
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);

  const { added, removed } = entryDiff(initialSelected, selected);
  const entriesDirty = added > 0 || removed > 0;
  const rowDirty = detailsChanged(draft, list);
  const isDirty = entriesDirty || rowDirty;

  const exitHref = useMemo(
    () => exitEditHref(list.id, searchParams),
    [searchParams, list.id]
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

  const exit = () => {
    router.push(exitHref);
    router.refresh();
  };

  const toggle = (itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Each concern is skipped when its own slice is unchanged, so a title-only
  // edit never touches the entries and a quantity-only edit never touches the
  // list row. The two writes are sequenced, not atomic across each other.
  const commit = async () => {
    if (entriesDirty) {
      const result = await setListItems(list.id, Array.from(selected));
      if (!result.success) throw new Error(result.message);
    }
    if (rowDirty) {
      const subtitle = draft.subtitle.trim();
      const result = await updateList(list.id, {
        name: draft.name,
        subtitle: subtitle === '' ? null : subtitle,
        occasion: draft.occasion,
        date: new Date(draft.date),
      });
      if (!result.success) throw new Error(result.message);
    }
  };

  const save = async () => {
    setIsSubmitting(true);
    try {
      await toast.promise(commit(), {
        loading: getMessage('edit_mode_save_loading'),
        success: getMessage('edit_mode_save_success'),
        error: (err: Error) =>
          err.message || getMessage('edit_mode_save_error'),
      });
      exit();
    } catch {
      // toast.promise has already surfaced the failure; the staged edit stays
      // on screen so the owner can correct it rather than lose it.
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSave = !dateFieldError(draft.date) && (isDirty || isNew);

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
  };

  return (
    <>
      <EditModeHeader
        draft={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        disabled={isSubmitting}
      />
      <EditModeItems
        items={items}
        selected={selected}
        initialSelected={initialSelected}
        onToggle={toggle}
        actor={actor}
        lists={lists}
        actingAs={actingAs}
      />
      <EditModeFooter
        totalSelected={selected.size}
        added={added}
        removed={removed}
        isNew={isNew}
        canSave={canSave}
        isSubmitting={isSubmitting}
        onCancel={handleCancel}
        onSave={handleSave}
      />
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
        isOpen={confirming === 'discard'}
        onClose={dismissConfirm}
        onConfirm={exit}
        title={getMessage('edit_mode_cancel_confirm_title')}
        message={getMessage('edit_mode_cancel_confirm_message')}
        confirmText={getMessage('edit_mode_discard_confirm_label')}
        cancelText={getMessage('edit_mode_confirm_dismiss_label')}
      />
    </>
  );
}
