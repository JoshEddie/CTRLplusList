import { PiCheckCircleFill, PiWarningDiamondFill, PiWarningFill } from 'react-icons/pi';
import { titleLine } from './IntroCard';

export type DeckRowVariant = 'check' | 'warning' | 'error';

const icons: Record<DeckRowVariant, typeof PiCheckCircleFill> = {
  check: PiCheckCircleFill,
  warning: PiWarningDiamondFill,
  error: PiWarningFill,
};

interface DeckRowProps {
  variant: DeckRowVariant;
  titleLine: titleLine[];
}

export function DeckRow({ variant, titleLine }: DeckRowProps) {
  const Icon = icons[variant];
  return (
    titleLine.map((row) => (
      <div className="deck_row" key={row.title}>
        <span className={`deck_row_icon ${variant}`}>
          <Icon />
        </span>
        <div className="deck_row_title">{row.title}</div>
        <div className="deck_row_details">{row.line}</div>
      </div>
    ))
  );
}
