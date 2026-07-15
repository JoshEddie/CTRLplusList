'use client';

import { Button } from '@/app/ui/components/button';
import {
  FaCircleCheck,
  FaCircleExclamation,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import { isValidStore } from '../../utils';
import type { FocusField } from './focus';
import { DESCRIPTION_MAX, priceTier, titleTier, type Tier } from './utils';
import type { ItemViewModel } from './viewModel';

const STATUS_ICONS = {
  good: FaCircleCheck,
  warn: FaTriangleExclamation,
  error: FaCircleExclamation,
} as const;

function TriageRow({
  label,
  value,
  provenance,
  tier,
  onClick,
}: {
  label: string;
  value: string;
  provenance?: string;
  tier: Tier;
  onClick: () => void;
}) {
  const Icon = STATUS_ICONS[tier];
  return (
    <button
      type="button"
      className={`deck-triage-row deck-triage-${tier}`}
      onClick={onClick}
    >
      <span className="deck-triage-main">
        <span className="deck-triage-label">{label}</span>
        <span className="deck-triage-value">{value}</span>
        {provenance && <span className="deck-triage-prov">{provenance}</span>}
      </span>
      <span className={`deck-triage-status deck-triage-status-${tier}`}>
        <Icon aria-hidden="true" />
        {tier === 'good' ? 'Looks good' : 'Needs you'}
      </span>
    </button>
  );
}

interface TriageProps {
  item: ItemViewModel;
  onBack: () => void;
  onFocus: (field: FocusField) => void;
  onOpenStores: () => void;
}

export function Triage({ item, onBack, onFocus, onOpenStores }: TriageProps) {
  const store = item.stores[0];
  const nameTier = titleTier(item.name);
  const priceT = priceTier(store?.price);
  const storeValid = isValidStore(store);
  const noteOver = item.description.length > DESCRIPTION_MAX;

  return (
    <div className="deck-triage deck-body">
      <header className="deck-triage-head">
        <h2 className="deck-triage-title">Review anything</h2>
        <p className="deck-triage-sub">Tap a field to fix it.</p>
      </header>

      <div className="deck-triage-rows">
        <TriageRow
          label="Photo"
          value={item.photos.length ? `${item.photos.length} found` : 'None'}
          tier={item.photos.length ? 'good' : 'warn'}
          onClick={() => onFocus('photo')}
        />
        <TriageRow
          label="Item name"
          value={item.name || 'None'}
          tier={nameTier.tier}
          onClick={() => onFocus('title')}
        />
        <TriageRow
          label="Note"
          value={item.description || 'Optional — none yet'}
          tier={noteOver ? 'error' : 'good'}
          onClick={() => onFocus('note')}
        />
        <TriageRow
          label="Price"
          value={
            store?.price ? `$${store.price.replace(/^\$/, '')}` : 'Not set'
          }
          provenance={store?.price_fetched_at ? 'from fetch' : undefined}
          tier={priceT.tier}
          onClick={() => onFocus('price')}
        />
        <TriageRow
          label="Store"
          value={store?.name || 'None'}
          provenance={store?.link ? 'saved from link' : undefined}
          tier={storeValid ? 'good' : 'warn'}
          onClick={onOpenStores}
        />
      </div>

      <Button variant="ghost" onClick={onBack}>
        ← Back to preview
      </Button>
    </div>
  );
}
