'use client';

import { SearchField } from '@/app/ui/components/field';
import { useEffect, useState } from 'react';

export function SearchInputControl({
  initialQ,
  onCommit,
}: {
  initialQ: string;
  onCommit: (next: string) => void;
}) {
  const [value, setValue] = useState(initialQ);

  useEffect(() => {
    if (value === initialQ) return;
    const handle = setTimeout(() => {
      onCommit(value);
    }, 200);
    return () => clearTimeout(handle);
  }, [value, initialQ, onCommit]);

  return (
    <SearchField
      placeholder="Search items..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClear={() => setValue('')}
      aria-label="Search items"
    />
  );
}
