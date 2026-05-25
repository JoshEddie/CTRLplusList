import { ReactNode } from 'react';
import { chipClasses } from './chipClasses';

type ChipProps = {
  children: ReactNode;
  onRemove: () => void;
  removeLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function Chip({
  children,
  onRemove,
  removeLabel,
  disabled,
  className,
}: ChipProps) {
  const label =
    removeLabel ??
    (typeof children === 'string' ? `Remove ${children}` : 'Remove');
  return (
    <span className={chipClasses({ extra: className })}>
      {children}
      <button
        type="button"
        className="chip-remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={label}
        disabled={disabled}
      >
        ×
      </button>
    </span>
  );
}
