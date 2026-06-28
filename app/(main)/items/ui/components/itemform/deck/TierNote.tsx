import {
  FaCircleCheck,
  FaCircleExclamation,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import type { Tier } from './utils';

const ICONS = {
  good: FaCircleCheck,
  warn: FaTriangleExclamation,
  error: FaCircleExclamation,
} as const;

// Conveys tier by a distinct icon shape + text (never color alone) so the
// state is perceivable without color — the a11y contract in D11.
export function TierNote({
  tier,
  children,
}: {
  tier: Tier;
  children: React.ReactNode;
}) {
  const Icon = ICONS[tier];
  return (
    <p className={`deck-tier-note deck-tier-${tier}`}>
      <Icon aria-hidden="true" className="deck-tier-icon" />
      <span>{children}</span>
    </p>
  );
}
