import type { ReactNode } from 'react';
import { PriceEditor } from '../editors/PriceEditor';
import { TierNote } from '../TierNote';
import { priceTier } from '../utils';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface PriceCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  productUrl: string;
  onBack: () => void;
  onContinue: () => void;
  progress?: ReactNode;
}

export function PriceCard({
  item,
  actions,
  productUrl,
  onBack,
  onContinue,
  progress,
}: PriceCardProps) {
  const store = item.stores[0];
  const tier = priceTier(store?.price);
  return (
    <DeckCard
      progress={progress}
      eyebrow="Step · The price"
      title="What does it cost?"
      subtitle="Add a price so people know the cost — there's no skipping this one."
      onBack={onBack}
      onContinue={onContinue}
      continueDisabled={tier.tier !== 'good'}
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
