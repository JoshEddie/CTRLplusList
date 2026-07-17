'use client';

import { Button } from '@/app/ui/components/button';
import { FiArrowLeft } from 'react-icons/fi';
import { DeckScreen } from './DeckShell';
import { FieldRows } from './FieldRows';
import type { RowField } from './focus';
import type { ItemViewModel } from './viewModel';

interface FillManuallyProps {
  item: ItemViewModel;
  onBack: () => void;
  onFocus: (field: RowField) => void;
}

export function FillManually({ item, onBack, onFocus }: FillManuallyProps) {
  return (
    <DeckScreen
      title="Add the details"
      subtitle="Tap a field to fill it in."
      foot={
        <Button variant="secondary" onClick={onBack} width="full">
          <FiArrowLeft />
          Use a link instead
        </Button>
      }
    >
      <FieldRows item={item} onFocus={onFocus} />
    </DeckScreen>
  );
}
