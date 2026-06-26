import { Button } from '@/app/ui/components/button';
import type { ReactNode } from 'react';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { PiStarFourFill } from 'react-icons/pi';

export interface DeckCardProps {
  eyebrow?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  progress?: ReactNode;
  children?: ReactNode;
  backLabel?: string;
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}

// Shared chrome for every deck card: progress + heading on top, the editor in
// the body, a back / (skip) / continue footer below.
export function DeckCard({
  eyebrow,
  title,
  subtitle,
  progress,
  children,
  backLabel = 'Back',
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
}: DeckCardProps) {
  return (
    <section className="deck-card">
      <header className="deck-card-head">
        {progress}
        {eyebrow && <p className="deck-eyebrow"><PiStarFourFill /> {eyebrow}</p>}
        <h2 className="deck-card-title">{title}</h2>
        {subtitle && <p className="deck-card-sub">{subtitle}</p>}
      </header>

      {children && <div className="deck-card-body">{children}</div>}

      <footer className="deck-card-foot">
        <Button variant="ghost" onClick={onBack}>
          <FiArrowLeft />
          {backLabel}
        </Button>
        <div className="deck-card-foot-end">
          <Button
            variant="primary"
            onClick={onContinue}
            disabled={continueDisabled}
            width='full'
          >
            {continueLabel}
            <FiArrowRight />
          </Button>
        </div>
      </footer>
    </section>
  );
}
