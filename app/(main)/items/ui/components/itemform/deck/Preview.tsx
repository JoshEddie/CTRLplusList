'use client';

import { Button } from '@/app/ui/components/button';
import type { ReactNode } from 'react';
import { FaList, FaPen, FaPlus, FaTag } from 'react-icons/fa6';
import { ActionRow } from './ActionRow';
import { DeckScreen } from './DeckShell';
import { PreviewCard } from './PreviewCard';
import { listsSubtext, storeSubtext } from './summaries';
import { TierNote } from './TierNote';
import { TrimChip } from './TrimChip';
import type { ItemActions } from './useItemActions';
import {
  DESCRIPTION_MAX,
  isLinkless,
  pricePairTier,
  storeTier,
  suggestTrim,
  nameTier,
} from './utils';
import type { ItemViewModel } from './viewModel';

interface PreviewProps {
  item: ItemViewModel;
  actions: ItemActions;
  isEditing: boolean;
  isPending: boolean;
  /** The active profile's name, only for a viewer who runs more than one. */
  actingAs?: string;
  onSubmit: () => void;
  onOpenTriage: () => void;
  onOpenStore: () => void;
  onOpenLists: () => void;
  onAddNote: () => void;
  /** Delete affordance for the edit path (preserves the retired form's contract). */
  deleteSlot?: ReactNode;
}

// The universal create/edit hub: a faithful card plus routes to Triage, the
// Store editor, the Lists sheet, and submit. Create/Save is gated on the same
// tier helpers as the deck so a too-long name — or an incomplete store or
// price — can't be saved.
export function Preview({
  item,
  actions,
  isEditing,
  isPending,
  actingAs,
  onSubmit,
  onOpenTriage,
  onOpenStore,
  onOpenLists,
  onAddNote,
  deleteSlot,
}: PreviewProps) {
  const tier = nameTier(item.name);
  const nameBlocked = tier.tier === 'error';
  const noteBlocked = item.description.length > DESCRIPTION_MAX;
  const storeBlocked = storeTier(item.store).tier === 'error';
  const priceBlocked = pricePairTier(item.store).tier === 'error';
  const blocked = nameBlocked || noteBlocked || storeBlocked || priceBlocked;
  const suggestion = suggestTrim(item.name);

  const blockNote = nameBlocked
    ? tier.note
    : noteBlocked
      ? `Your description is over the ${DESCRIPTION_MAX}-character limit — trim it to save.`
      : storeBlocked
        ? storeTier(item.store).note
        : pricePairTier(item.store).note;

  return (
    <DeckScreen
      title={isEditing ? 'Editing' : 'Last look'}
      subtitle={
        isEditing
          ? 'Update anything, then save.'
          : "Here's your item exactly as it'll appear."
      }
      foot={
        <div className="deck-screen-ft-row">
          {deleteSlot}
          <Button
            variant="primary"
            onClick={onSubmit}
            isLoading={isPending}
            disabled={blocked}
            width="full"
          >
            {isEditing
              ? 'Save changes'
              : actingAs
                ? `Create item for ${actingAs}`
                : 'Create item'}
          </Button>
        </div>
      }
    >
      <div className="deck-preview">
        <div className="deck-preview-body">
          <PreviewCard item={item} />

          <div className="deck-preview-actions">
            <ActionRow
              variant="accent"
              icon={<FaPen />}
              label="Need to change something?"
              sub="Fix anything that looks wrong"
              onClick={onOpenTriage}
            />
            {!isLinkless(item) && (
              <ActionRow
                icon={<FaTag />}
                label="Store"
                sub={storeSubtext(item)}
                onClick={onOpenStore}
              />
            )}
            <ActionRow
              icon={<FaList />}
              label="Lists"
              sub={listsSubtext(item)}
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
            <TierNote tier="error">{blockNote}</TierNote>
            {nameBlocked && suggestion && suggestion !== item.name.trim() && (
              <TrimChip
                suggestion={suggestion}
                onApply={() => actions.setName(suggestion)}
              />
            )}
          </div>
        )}
      </div>
    </DeckScreen>
  );
}
