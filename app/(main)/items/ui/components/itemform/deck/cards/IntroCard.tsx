import type { ReactNode } from 'react';
import type { DeckStep } from '../neededSteps';
import { priceTier, titleTier } from '../utils';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';
import { DeckRow } from './DeckRow';

interface IntroCardProps {
  item: ItemViewModel;
  steps: DeckStep[];
  storeName: string;
  onBack: () => void;
  onContinue: () => void;
  progress?: ReactNode;
}

export type TitleLine = { title: string; line: string };

// Summarizes what the fetch confirmed (green fields, never bypassed via a global
// skip) and how much is left. Forward is "Let's go" only (D3, correction #1).
export function IntroCard({
  item,
  steps,
  storeName,
  onBack,
  onContinue,
  progress,
}: IntroCardProps) {
  const store = item.stores[0];
  const confirmed: TitleLine[] = [];
  const warning: TitleLine[] = [];
  const error: TitleLine[] = [];
  if (item.photos.length > 0) {
    confirmed.push({
      title: 'Photos',
      line: `${item.photos.length} option${item.photos.length === 1 ? '' : 's'} found`,
    });
  }
  if (titleTier(item.name).tier === 'good') {
    confirmed.push({
      title: 'Item name',
      line: `${item.name}`,
    });
  } else if (titleTier(item.name).tier === 'warn') {
    warning.push({
      title: 'Item name',
      line: 'Review the name for best results',
    });
  } else {
    error.push({
      title: 'Item name',
      line: 'Name is too long',
    });
  }

  if (store && priceTier(store.price).tier === 'good') {
    confirmed.push({
      title: 'Price',
      line: `$${store.price.replace(/^\$/, '')}`,
    });
  } else {
    warning.push({
      title: 'Price',
      line: 'Unable to find price',
    });
  }

  if (store?.name && store?.link) {
    confirmed.push({
      title: 'Store',
      line: `${store.name} • link saved`,
    });
  }

  const remaining = steps.length - 1;
  const hasSummary = confirmed.length + warning.length + error.length > 0;

  return (
    <DeckCard
      progress={progress}
      eyebrow={storeName ? `Auto-filled from ${storeName}` : undefined}
      title="Here's what we pulled."
      subtitle="We grabbed everything we could. We'll walk you through anything that needs your attention. You'll get a chance to preview and confirm everything at the end."
      backLabel="Change link"
      onBack={onBack}
      onContinue={onContinue}
      continueLabel="Let's go"
    >
      {hasSummary && (
        <div className="deck-intro-confirmed">
          <DeckRow variant="check" rows={confirmed} />
          <DeckRow variant="warning" rows={warning} />
          <DeckRow variant="error" rows={error} />
        </div>
      )}
      <p className="deck-intro-count">
        {remaining === 0
          ? 'Everything looks good — take a last look.'
          : `${remaining} quick ${remaining === 1 ? 'step' : 'steps'} to go.`}
      </p>
    </DeckCard>
  );
}
