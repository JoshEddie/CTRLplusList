'use client';

import { getMessage } from '@/lib/i18n/utils';
import { useId, useState, type ReactNode } from 'react';
import './stepper.css';

const MIN = 1;

// Every route the control offers goes through here, so a value it produced is
// always one a button could have reached — which is what lets the callers drop
// their own validation and their inert-until-valid buttons.
function clamp(value: number, max: number): number {
  return Math.min(Math.max(Math.trunc(value) || MIN, MIN), max);
}

export function Stepper({
  label,
  status,
  description,
  value,
  max,
  onChange,
}: {
  label: string;
  /** Context beside the number — what is already spoken for. Static: it reports the world, not the value being picked. */
  status?: ReactNode;
  description?: ReactNode;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  // What has been typed but not yet settled. Without it the input can never be
  // empty, so clearing it to type a two-digit number prepends to the digit that
  // snapped back — "12" over a cleared 6 arrives as "16".
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (next: number) => {
    setDraft(null);
    onChange(next);
  };

  const id = useId();
  const inputId = `${id}-input`;
  const descriptionId = description ? `${id}-description` : undefined;
  const atMin = value <= MIN;
  const atMax = value >= max;

  return (
    <div className="stepper_group">
      <div className="stepper_label_row">
        <label className="stepper_label" htmlFor={inputId}>
          {label}
        </label>
        {status && (
          <span className="stepper_status" role="status">
            {status}
          </span>
        )}
      </div>
      {description && (
        <p id={descriptionId} className="stepper_description">
          {description}
        </p>
      )}
      <div className="stepper" role="group" aria-label={label}>
        <button
          type="button"
          className="stepper_jump"
          disabled={atMin}
          aria-label={getMessage('stepper_min_label', { value: MIN })}
          onClick={() => commit(MIN)}
        >
          <span className="stepper_caption">
            {getMessage('stepper_min_caption')}
          </span>
          {MIN}
        </button>
        <button
          type="button"
          className="stepper_step"
          disabled={atMin}
          aria-label={getMessage('stepper_decrease_label')}
          onClick={() => commit(clamp(value - 1, max))}
        >
          −
        </button>
        <input
          id={inputId}
          className="stepper_input"
          type="number"
          inputMode="numeric"
          min={MIN}
          max={max}
          value={draft ?? value}
          aria-describedby={descriptionId}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(clamp(Number(e.target.value), max));
          }}
          onBlur={() => setDraft(null)}
        />
        <button
          type="button"
          className="stepper_step"
          disabled={atMax}
          aria-label={getMessage('stepper_increase_label')}
          onClick={() => commit(clamp(value + 1, max))}
        >
          +
        </button>
        <button
          type="button"
          className="stepper_jump"
          disabled={atMax}
          aria-label={getMessage('stepper_max_label', { value: max })}
          onClick={() => commit(max)}
        >
          <span className="stepper_caption">
            {getMessage('stepper_max_caption')}
          </span>
          {max}
        </button>
      </div>
    </div>
  );
}
