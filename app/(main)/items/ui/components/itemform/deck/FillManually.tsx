'use client';

import { Button } from '@/app/ui/components/button';
import { FieldRows } from './FieldRows';
import type { FocusField } from './focus';
import type { ItemViewModel } from './viewModel';

interface FillManuallyProps {
  item: ItemViewModel;
  onBack: () => void;
  onFocus: (field: FocusField) => void;
  onOpenStores: () => void;
}

export function FillManually({
  item,
  onBack,
  onFocus,
  onOpenStores,
}: FillManuallyProps) {
  return (
    <div className="deck-triage deck-body">
      <header className="deck-triage-head">
        <h2 className="deck-triage-title">Add the details</h2>
        <p className="deck-triage-sub">Tap a field to fill it in.</p>
      </header>

      <FieldRows item={item} onFocus={onFocus} onOpenStores={onOpenStores} />

      <Button variant="secondary" onClick={onBack}>
        ← Use a link instead
      </Button>
    </div>
  );
}
