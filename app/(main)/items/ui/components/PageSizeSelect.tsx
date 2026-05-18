'use client';

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
    <label className="page-size-select">
      <span className="sr-only">Items per page</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Items per page"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n} / page
          </option>
        ))}
      </select>
    </label>
  );
}
