import type { ReactNode } from 'react';
import { PriceEditor } from '../editors/PriceEditor';
import { TierNote } from '../TierNote';
import { stepBlocked } from '../neededSteps';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface PriceCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  productUrl: string;
  onContinue: () => void;
  tracker?: ReactNode;
}

export function PriceCard({
  item,
  actions,
  productUrl,
  onContinue,
  tracker,
}: PriceCardProps) {
  const store = item.stores[0];
  return (
    <DeckCard
      tracker={tracker}
      title="What does it cost?"
      subtitle="Add a price so people know the cost — there's no skipping this one."
      onContinue={onContinue}
      continueDisabled={stepBlocked('price', item)}
    >
      <PriceEditor
        price={store?.price ?? ''}
        onChange={(value) => actions.setStore(0, 'price', value)}
        productUrl={productUrl || store?.link}
      />
      {!store?.price?.trim() && (
        <TierNote tier="error">
          A price is required before you can continue.
        </TierNote>
      )}
    </DeckCard>
  );
}
