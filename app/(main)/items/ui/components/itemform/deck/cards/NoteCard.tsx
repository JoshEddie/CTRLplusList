import type { ReactNode } from 'react';
import { NoteEditor } from '../editors/NoteEditor';
import { DESCRIPTION_MAX } from '../utils';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface NoteCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  onBack: () => void;
  onContinue: () => void;
  progress?: ReactNode;
}

export function NoteCard({
  item,
  actions,
  onBack,
  onContinue,
  progress,
}: NoteCardProps) {
  return (
    <DeckCard
      progress={progress}
      eyebrow="Step · A note"
      title="Add a note"
      subtitle="Descriptions aren't pulled automatically — keep it short and specific."
      onBack={onBack}
      onContinue={onContinue}
      continueDisabled={item.description.length > DESCRIPTION_MAX}
    >
      <NoteEditor
        description={item.description}
        onChange={actions.setDescription}
        helper="Optional — a size, color, or detail that matters."
      />
    </DeckCard>
  );
}
