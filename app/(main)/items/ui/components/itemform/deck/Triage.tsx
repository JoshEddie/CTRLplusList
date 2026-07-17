'use client';

import { Button } from '@/app/ui/components/button';
import { FiArrowLeft } from 'react-icons/fi';
import { DeckScreen } from './DeckShell';
import { FieldRows } from './FieldRows';
import type { RowField } from './focus';
import type { ItemViewModel } from './viewModel';

interface TriageProps {
  item: ItemViewModel;
  onBack: () => void;
  onFocus: (field: RowField) => void;
}

export function Triage({ item, onBack, onFocus }: TriageProps) {
  return (
    <DeckScreen
      title="Review anything"
      subtitle="Tap a field to fix it."
      foot={
        <Button variant="primary" onClick={onBack} width="full">
          <FiArrowLeft />
          Back to preview
        </Button>
      }
    >
      <FieldRows item={item} onFocus={onFocus} />
    </DeckScreen>
  );
}
