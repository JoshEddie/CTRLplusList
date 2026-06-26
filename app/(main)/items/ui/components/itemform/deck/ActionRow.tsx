import type { ReactNode } from 'react';
import { FaChevronRight } from 'react-icons/fa6';

interface ActionRowProps {
  icon: ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  /** "lavender" is the non-alarming Triage entry (D8). */
  variant?: 'lavender';
}

// Composite tappable row — a page-scoped accessible <button>, not a Button
// variant (it's multi-line + iconic). Sized to the 44px floor in CSS (D9).
export function ActionRow({ icon, label, sub, onClick, variant }: ActionRowProps) {
  return (
    <button
      type="button"
      className={`deck-actrow${variant ? ` deck-actrow-${variant}` : ''}`}
      onClick={onClick}
    >
      <span className="deck-actrow-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="deck-actrow-text">
        <span className="deck-actrow-label">{label}</span>
        {sub && <span className="deck-actrow-sub">{sub}</span>}
      </span>
      <FaChevronRight className="deck-actrow-chevron" aria-hidden="true" />
    </button>
  );
}
