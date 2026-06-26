import type { ReactNode } from 'react';
import { TitleEditor } from '../editors/TitleEditor';
import type { ItemActions } from '../useItemActions';
import { titleTier } from '../utils';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface TitleCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  onBack: () => void;
  onContinue: () => void;
  progress?: ReactNode;
}

export function TitleCard({
  item,
  actions,
  onBack,
  onContinue,
  progress,
}: TitleCardProps) {
  const tier = titleTier(item.name);
  return (
    <DeckCard
      progress={progress}
      eyebrow="Step · The name"
      title="Give it a clear name"
      subtitle="Scraped names carry junk. Tighten it so it's easy to read."
      onBack={onBack}
      onContinue={onContinue}
      continueLabel={tier.tier === 'warn' ? 'Keep it anyway' : 'Continue'}
      continueDisabled={tier.tier === 'error'}
    >
      <TitleEditor
        name={item.name}
        description={item.description}
        onNameChange={actions.setName}
        onDescriptionChange={actions.setDescription}
      />
    </DeckCard>
  );
}
