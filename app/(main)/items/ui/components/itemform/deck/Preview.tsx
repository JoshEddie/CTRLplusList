'use client';

import { Button } from '@/app/ui/components/button';
import type { ReactNode } from 'react';
import { FaList, FaPen, FaPlus, FaTag } from 'react-icons/fa6';
import { ActionRow } from './ActionRow';
import { PreviewCard } from './PreviewCard';
import { listsQtySubtext, storesSubtext } from './summaries';
import { TierNote } from './TierNote';
import { TrimChip } from './TrimChip';
import type { ItemActions } from './useItemActions';
import { DESCRIPTION_MAX, suggestTrim, titleTier } from './utils';
import type { ItemViewModel } from './viewModel';

interface PreviewProps {
  item: ItemViewModel;
  actions: ItemActions;
  isEditing: boolean;
  isPending: boolean;
  onSubmit: () => void;
  onOpenTriage: () => void;
  onOpenStores: () => void;
  onOpenLists: () => void;
  onAddNote: () => void;
  /** Delete affordance for the edit path (preserves the retired form's contract). */
  deleteSlot?: ReactNode;
}

// The universal create/edit hub (D1): a faithful card plus routes to Triage,
// the Stores / Lists sheets, and submit. Create/Save is gated on the same tier
// helpers as the deck so a too-long name can't be saved.
export function Preview({
  item,
  actions,
  isEditing,
  isPending,
  onSubmit,
  onOpenTriage,
  onOpenStores,
  onOpenLists,
  onAddNote,
  deleteSlot,
}: PreviewProps) {
  const tier = titleTier(item.name);
  const titleBlocked = tier.tier === 'error';
  const noteBlocked = item.description.length > DESCRIPTION_MAX;
  const blocked = titleBlocked || noteBlocked;
  const suggestion = suggestTrim(item.name);

  return (
    <div className="deck-preview">
      <header className="deck-preview-head">
        <h2 className="deck-preview-title">
          {isEditing ? 'Editing' : 'Last look'}
        </h2>
        <p className="deck-preview-sub">
          {isEditing
            ? 'Update anything, then save.'
            : "Here's your item exactly as it'll appear."}
        </p>
      </header>

      <div className="deck-preview-body">
        <PreviewCard item={item} />

        <div className="deck-preview-actions">
          <ActionRow
            variant="lavender"
            icon={<FaPen />}
            label="Need to change something?"
            sub="Fix anything we got wrong"
            onClick={onOpenTriage}
          />
          <ActionRow
            icon={<FaTag />}
            label="Store links"
            sub={storesSubtext(item)}
            onClick={onOpenStores}
          />
          <ActionRow
            icon={<FaList />}
            label="Lists & quantity"
            sub={listsQtySubtext(item)}
            onClick={onOpenLists}
          />
          {!item.description && (
            <ActionRow
              icon={<FaPlus />}
              label="Add a note"
              sub="Optional description"
              onClick={onAddNote}
            />
          )}
        </div>
      </div>

      {blocked && (
        <div className="deck-preview-block">
          <TierNote tier="error">
            {titleBlocked
              ? tier.note
              : `Your description is over the ${DESCRIPTION_MAX}-character limit — trim it to save.`}
          </TierNote>
          {titleBlocked && suggestion && suggestion !== item.name.trim() && (
            <TrimChip
              suggestion={suggestion}
              onApply={() => actions.setName(suggestion)}
            />
          )}
        </div>
      )}

      <div className="deck-preview-submit">
        {deleteSlot}
        <Button
          variant="primary"
          onClick={onSubmit}
          isLoading={isPending}
          disabled={blocked}
        >
          {isEditing ? 'Save changes' : 'Create item'}
        </Button>
      </div>
    </div>
  );
}
