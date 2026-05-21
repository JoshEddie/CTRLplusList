'use client';

import { SelectField } from '@/app/ui/components/field';
import { PAGE_SIZE_OPTIONS } from './paginationConstants';

interface PageSizeSelectProps {
  value: number;
  onChange: (next: number) => void;
}

export default function PageSizeSelect({
  value,
  onChange,
}: PageSizeSelectProps) {
  return (
    <div className="page-size-select">
      <SelectField
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Items per page"
        options={PAGE_SIZE_OPTIONS.map((n) => ({
          value: String(n),
          label: `${n} / page`,
        }))}
        fieldSize="sm"
      />
    </div>
  );
}
