import { Button } from '@/app/ui/components/button';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { DeckScreen } from '../DeckShell';
import type { DeckStepState } from '../neededSteps';
import { summarize } from '../utils';
import type { ItemViewModel } from '../viewModel';
import { DeckRow } from './DeckRow';

interface IntroCardProps {
  item: ItemViewModel;
  steps: DeckStepState[];
  storeName: string;
  onBack: () => void;
  onContinue: () => void;
}

// Summarizes what the fetch confirmed (green fields, never bypassed via a
// global skip) and how much is left. The pre-step overview: no tracker here —
// that starts on the field cards. Back is "Change link" (return to URL entry).
export function IntroCard({
  item,
  steps,
  storeName,
  onBack,
  onContinue,
}: IntroCardProps) {
  const { confirmed, warning, error } = summarize(item);
  const remaining = steps.filter((s) => !s.complete).length;
  const hasSummary = confirmed.length + warning.length + error.length > 0;

  return (
    <DeckScreen
      title="Here's what we pulled."
      subtitle={
        storeName
          ? `Auto-filled from ${storeName}. We'll walk you through anything that needs your attention — you'll get a chance to preview and confirm everything at the end.`
          : "We grabbed everything we could. We'll walk you through anything that needs your attention. You'll get a chance to preview and confirm everything at the end."
      }
      foot={
        <div className="deck-screen-ft-row">
          <Button variant="ghost" onClick={onBack}>
            <FiArrowLeft />
            Change link
          </Button>
          <Button variant="primary" onClick={onContinue} width="full">
            Let&apos;s go
            <FiArrowRight />
          </Button>
        </div>
      }
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
    </DeckScreen>
  );
}
