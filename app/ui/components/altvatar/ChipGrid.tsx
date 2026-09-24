'use client';

import type { AxisOffer } from '@/lib/altvatar/resolve';
import { LuCheck } from 'react-icons/lu';
import { labelOfAxis } from './utils';

export default function ChipGrid({
  offer,
  current,
  onChange,
}: {
  offer: Extract<AxisOffer, { kind: 'color' }>;
  current: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="altvatar-chips"
      role="radiogroup"
      aria-label={labelOfAxis(offer.axis)}
    >
      {offer.palette.map((v) => {
        const selected = v.value === current;
        return (
          <button
            key={v.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`altvatar-chip${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(v.value)}
          >
            <span
              className="altvatar-chip-fill"
              style={{ background: `#${v.value}` }}
            >
              {selected && (
                <span className="altvatar-chip-mark" aria-hidden>
                  <LuCheck />
                </span>
              )}
            </span>
            <span className="altvatar-chip-label">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
