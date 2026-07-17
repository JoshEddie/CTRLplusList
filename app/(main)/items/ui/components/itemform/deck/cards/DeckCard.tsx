import { Button } from '@/app/ui/components/button';
import type { ReactNode } from 'react';
import { FiArrowRight } from 'react-icons/fi';
import { DeckScreen } from '../DeckShell';

export interface DeckCardProps {
  title: string;
  subtitle?: ReactNode;
  tracker?: ReactNode;
  children?: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}

// Shared frame for every deck field card: pinned title/subtitle header, the
// editor in the scrolling well, tracker + full-width continue pinned below.
// Backward navigation is the tracker, so there is no Back button.
export function DeckCard({
  title,
  subtitle,
  tracker,
  children,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
}: DeckCardProps) {
  return (
    <DeckScreen
      title={title}
      subtitle={subtitle}
      foot={
        <>
          {tracker}
          <Button
            variant="primary"
            onClick={onContinue}
            disabled={continueDisabled}
            width="full"
          >
            {continueLabel}
            <FiArrowRight />
          </Button>
        </>
      }
    >
      {children}
    </DeckScreen>
  );
}
