import {
  FaCircleCheck,
  FaCircleExclamation,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import type { TierResult } from './utils';

const STATUS_ICONS = {
  good: FaCircleCheck,
  warn: FaTriangleExclamation,
  error: FaCircleExclamation,
} as const;

export default function FieldRow({
  label,
  value,
  provenance,
  status,
  onClick,
}: {
  label: string;
  value: string;
  provenance?: string;
  status: TierResult;
  onClick: () => void;
}) {
  const Icon = STATUS_ICONS[status.tier];
  return (
    <button
      type="button"
      className={`deck-triage-row deck-triage-${status.tier}`}
      onClick={onClick}
    >
      <span className="deck-triage-main">
        <span className="deck-triage-label">{label}</span>
        <span className="deck-triage-value">{value}</span>
        {provenance && <span className="deck-triage-prov">{provenance}</span>}
      </span>
      <span className={`deck-triage-status deck-triage-status-${status.tier}`}>
        <Icon aria-hidden="true" />
        {status.tier === 'good' ? status.note || 'Looks good' : status.note}
      </span>
    </button>
  );
}
