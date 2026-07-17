import type { ReactNode } from 'react';
import { NoteEditor } from '../editors/NoteEditor';
import { stepBlocked } from '../neededSteps';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface NoteCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  onContinue: () => void;
  tracker?: ReactNode;
}

export function NoteCard({
  item,
  actions,
  onContinue,
  tracker,
}: NoteCardProps) {
  return (
    <DeckCard
      tracker={tracker}
      title="Add a note"
      subtitle="Descriptions aren't pulled automatically — keep it short and specific."
      onContinue={onContinue}
      continueDisabled={stepBlocked('note', item)}
    >
      <NoteEditor
        description={item.description}
        onChange={actions.setDescription}
        helper="Optional — a size, color, or detail that matters."
      />
    </DeckCard>
  );
}
