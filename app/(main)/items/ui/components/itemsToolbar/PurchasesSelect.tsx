'use client';

import { SelectField } from '@/app/ui/components/field';
import { BrowserMode } from './types';

export function PurchasesSelect({
  mode,
  purchases,
  onChange,
}: {
  mode: BrowserMode;
  purchases: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="items-toolbar-cell--purchases">
      <SelectField
        value={purchases}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Purchases filter"
      >
        {mode === 'items' ? (
          <>
            <option value="hide">Hide purchases</option>
            <option value="reveal">Reveal purchases</option>
            <option value="only">Only purchased</option>
            <option value="none">Only not purchased</option>
          </>
        ) : (
          <>
            <option value="hide">All</option>
            <option value="only">Only purchased</option>
            <option value="none">Only not purchased</option>
          </>
        )}
      </SelectField>
    </div>
  );
}
