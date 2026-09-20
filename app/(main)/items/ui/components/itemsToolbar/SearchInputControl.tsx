'use client';

import { SearchField } from '@/app/ui/components/field';
import { useEffect, useRef, useState } from 'react';

const COMMIT_DEBOUNCE_MS = 200;

export function SearchInputControl({
  initialQ,
  onCommit,
}: {
  initialQ: string;
  onCommit: (next: string) => void;
}) {
  const [value, setValue] = useState(initialQ);
  const committedRef = useRef(initialQ);

  // A commit echoes back as a new `initialQ` a tick or two later; adopting that
  // echo would wipe out whatever was typed while it was in flight. Only a query
  // this control did not write — back/forward, "Clear filters" — reseeds it.
  useEffect(() => {
    if (initialQ === committedRef.current) return;
    committedRef.current = initialQ;
    setValue(initialQ);
  }, [initialQ]);

  useEffect(() => {
    if (value === committedRef.current) return;
    const handle = setTimeout(() => {
      committedRef.current = value;
      onCommit(value);
    }, COMMIT_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [value, onCommit]);

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
