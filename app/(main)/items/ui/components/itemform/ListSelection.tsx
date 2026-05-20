// ListSelection.tsx — inline chip picker matching the Stage 5 mockup.
'use client';

import { FormGroup, FormLabel } from '@/app/ui/components/Form/Form';
import { OptionType } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';

interface ListSelectionProps {
  options: OptionType[];
  name: string;
  onChange: (value: OptionType | OptionType[] | null) => void;
  isPending?: boolean;
  placeholder?: string;
  isMulti?: boolean;
  defaultValue?: OptionType | OptionType[];
  isClearable?: boolean;
  error?: string;
}

export function ListSelection({
  name,
  onChange,
  options,
  isPending,
  placeholder = 'Select a list',
  defaultValue,
  error = '',
}: ListSelectionProps) {
  const [selected, setSelected] = useState<OptionType[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const remove = (value: string) => {
    const next = selected.filter((s) => s.value !== value);
    setSelected(next);
    onChange(next);
  };

  const add = (option: OptionType) => {
    if (selected.some((s) => s.value === option.value)) return;
    const next = [...selected, option];
    setSelected(next);
    onChange(next);
    setOpen(false);
  };

  const available = options.filter(
    (o) => !selected.some((s) => s.value === o.value)
  );

  return (
    <FormGroup>
      <FormLabel htmlFor={`${name}-trigger`}>Lists</FormLabel>
      <div
        ref={wrapRef}
        className={`if-lp${error ? ' form-input-error' : ''}`}
      >
        <div className="if-lp-top">
          {selected.map((s) => (
            <span key={s.value} className="if-lp-chip">
              {s.label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(s.value);
                }}
                aria-label={`Remove ${s.label}`}
                disabled={isPending}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            id={`${name}-trigger`}
            className="form-input if-lp-trigger"
            onClick={() => setOpen((o) => !o)}
            disabled={isPending}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="if-lp-trigger-label">
              {selected.length === 0 ? placeholder : 'Add another list…'}
            </span>
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {open && (
          <div className="if-lp-menu" role="listbox">
            {available.length === 0 ? (
              <div className="if-lp-empty">All lists selected</div>
            ) : (
              available.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className="if-lp-opt"
                  onClick={() => add(o)}
                  role="option"
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {error && <div className="input-error">{error}</div>}
    </FormGroup>
  );
}
