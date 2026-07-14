import type { ReactNode } from 'react';
import type { DeckStep } from '../neededSteps';
import { summarize } from '../utils';
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
  const { confirmed, warning, error } = summarize(item);
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
