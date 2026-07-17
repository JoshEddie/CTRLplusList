import type { ReactNode } from 'react';
import { TitleEditor } from '../editors/TitleEditor';
import { stepBlocked } from '../neededSteps';
import type { ItemActions } from '../useItemActions';
import { titleTier } from '../utils';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface TitleCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  onContinue: () => void;
  tracker?: ReactNode;
}

export function TitleCard({
  item,
  actions,
  onContinue,
  tracker,
}: TitleCardProps) {
  const tier = titleTier(item.name);
  return (
    <DeckCard
      tracker={tracker}
      title="Give it a clear name"
      subtitle="Scraped names carry junk. Tighten it so it's easy to read."
      onContinue={onContinue}
      continueLabel={tier.tier === 'warn' ? 'Keep it anyway' : 'Continue'}
      continueDisabled={stepBlocked('title', item)}
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
