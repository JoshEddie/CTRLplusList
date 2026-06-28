import {
  PiCheckCircleFill,
  PiWarningDiamondFill,
  PiWarningFill,
} from 'react-icons/pi';
import type { TitleLine } from './IntroCard';

export type DeckRowVariant = 'check' | 'warning' | 'error';

const icons: Record<DeckRowVariant, typeof PiCheckCircleFill> = {
  check: PiCheckCircleFill,
  warning: PiWarningDiamondFill,
  error: PiWarningFill,
};

interface DeckRowProps {
  variant: DeckRowVariant;
  rows: TitleLine[];
}

export function DeckRow({ variant, rows }: DeckRowProps) {
  const Icon = icons[variant];
  return rows.map((row) => (
    <div className="deck-row" key={row.title}>
      <span className={`deck-row-icon ${variant}`}>
        <Icon />
      </span>
      <div className="deck-row-title">{row.title}</div>
      <div className="deck-row-details">{row.line}</div>
    </div>
  ));
}
