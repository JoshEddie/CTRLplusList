import type { ReactNode } from 'react';
import { StoreEditor } from '../editors/StoreEditor';
import { stepBlocked } from '../neededSteps';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface StoreCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  onContinue: () => void;
  tracker?: ReactNode;
}

export function StoreCard({
  item,
  actions,
  onContinue,
  tracker,
}: StoreCardProps) {
  const store = item.store;
  return (
    <DeckCard
      tracker={tracker}
      title="Where's it from?"
      subtitle="Name the store so people know where to buy it."
      onContinue={onContinue}
      continueDisabled={stepBlocked('store', item)}
    >
      <StoreEditor
        name={store.name}
        link={store.link}
        onNameChange={(value) => actions.setStore('name', value)}
        onLinkChange={(value) => actions.setStore('link', value)}
      />
    </DeckCard>
  );
}
