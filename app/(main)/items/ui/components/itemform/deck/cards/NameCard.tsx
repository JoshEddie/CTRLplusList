import type { ReactNode } from 'react';
import { NameEditor } from '../editors/NameEditor';
import { stepBlocked } from '../neededSteps';
import type { ItemActions } from '../useItemActions';
import { isLinkless, nameTier } from '../utils';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface NameCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  onContinue: () => void;
  tracker?: ReactNode;
}

export function NameCard({
  item,
  actions,
  onContinue,
  tracker,
}: NameCardProps) {
  const tier = nameTier(item.name);
  return (
    <DeckCard
      tracker={tracker}
      title="Give it a clear name"
      subtitle={
        isLinkless(item)
          ? 'Short and clear works best — extra detail can go in the description.'
          : "Scraped names carry junk. Tighten it so it's easy to read."
      }
      onContinue={onContinue}
      continueLabel={tier.tier === 'warn' ? 'Keep it anyway' : 'Continue'}
      continueDisabled={stepBlocked('name', item)}
    >
      <NameEditor
        name={item.name}
        description={item.description}
        onNameChange={actions.setName}
        onDescriptionChange={actions.setDescription}
        linkless={isLinkless(item)}
      />
    </DeckCard>
  );
}
