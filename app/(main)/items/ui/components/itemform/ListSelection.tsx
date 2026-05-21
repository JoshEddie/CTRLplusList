// ListSelection.tsx — inline chip picker matching the Stage 5 mockup.
'use client';

import { FieldError } from '@/app/ui/components/field';
import { PopoverTrigger } from '@/app/ui/components/popover-trigger';
import { usePopoverDismiss } from '@/app/ui/hooks/usePopoverDismiss';
import { OptionType } from '@/lib/types';
import { useId, useRef, useState } from 'react';

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
  const reactId = useId();
  const errorId = error ? `${reactId}-error` : undefined;

  usePopoverDismiss({
    open,
    onClose: () => setOpen(false),
    ref: wrapRef,
  });

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

  // ListSelection is a custom popover-listbox composite, not a single field
  // primitive — FormField's cloneElement injection doesn't fit. We wire the
  // label/error association manually here (the documented exception per
  // standardize-form-fields spec, requirement "All form-field call sites").
  return (
    <div className="form_field_group">
      <label htmlFor={`${name}-trigger`} className="form_field_label">
        Lists
      </label>
      <div
        ref={wrapRef}
        className={`if-lp${error ? ' if-lp--invalid' : ''}`}
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
          <PopoverTrigger
            id={`${name}-trigger`}
            label={
              selected.length === 0 ? placeholder : 'Add another list…'
            }
            onClick={() => setOpen((o) => !o)}
            disabled={isPending}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
          />
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
      {error && errorId && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
