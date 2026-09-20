'use client';

// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import {
  FaCircleCheck,
  FaCircleExclamation,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import type { RowField } from './focus';
import { isLinkless, rowTiers, type TierResult } from './utils';
import type { ItemViewModel } from './viewModel';

const STATUS_ICONS = {
  good: FaCircleCheck,
  warn: FaTriangleExclamation,
  error: FaCircleExclamation,
} as const;

function FieldRow({
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

interface FieldRowsProps {
  item: ItemViewModel;
  onFocus: (field: RowField) => void;
}

export function FieldRows({ item, onFocus }: FieldRowsProps) {
  const store = item.store;
  const tiers = rowTiers(item);

  return (
    <div className="deck-triage-rows">
      <FieldRow
        label="Photo"
        value={item.photos.length ? `${item.photos.length} found` : 'None'}
        status={tiers.photo}
        onClick={() => onFocus('photo')}
      />
      <FieldRow
        label="Item name"
        value={item.name || 'None'}
        status={tiers.name}
        onClick={() => onFocus('name')}
      />
      <FieldRow
        label="Note"
        value={item.description || 'Optional — none yet'}
        status={tiers.note}
        onClick={() => onFocus('note')}
      />
      <FieldRow
        label="Price"
        value={store?.price ? `$${store.price.replace(/^\$/, '')}` : 'Not set'}
        provenance={store?.price_fetched_at ? 'from fetch' : undefined}
        status={tiers.price}
        onClick={() => onFocus('price')}
      />
      {!isLinkless(item) && (
        <FieldRow
          label="Store"
          value={store?.name || 'None'}
          provenance={store?.link ? 'saved from link' : undefined}
          status={tiers.store}
          onClick={() => onFocus('store')}
        />
      )}
    </div>
  );
}
