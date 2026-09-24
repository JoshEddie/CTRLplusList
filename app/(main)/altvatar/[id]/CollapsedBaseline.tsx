'use client';

import type { SpoilerTier } from '@/lib/types';
import { useState } from 'react';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';
import ClaimVisibilityFields, { tierLabel } from './ClaimVisibilityFields';
import { useBaselineEditor, type Save } from './utils';

// Collapsed by default: a profile with many members would otherwise be a wall
// of identical control sets. The summary carries the tier so the closed row
// still answers what it is set to.
export default function CollapsedBaseline({
  title,
  label,
  hint,
  initial,
  disabled,
  save,
}: {
  title: string;
  label: string;
  hint?: string;
  initial: SpoilerTier;
  disabled: boolean;
  save: Save;
}) {
  const { value, isPending, commit } = useBaselineEditor(initial, save);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="claim-visibility-row">
      <button
        type="button"
        className="claim-visibility-trigger"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="claim-visibility-row-title">{title}</span>
        <span className="claim-visibility-row-summary">{tierLabel(value)}</span>
        {expanded ? <MdExpandLess aria-hidden /> : <MdExpandMore aria-hidden />}
      </button>
      {expanded && (
        <div className="claim-visibility-row-body">
          {hint && <p className="claim-visibility-hint">{hint}</p>}
          <ClaimVisibilityFields
            value={value}
            disabled={disabled || isPending}
            label={label}
            onChange={commit}
          />
        </div>
      )}
    </div>
  );
}
