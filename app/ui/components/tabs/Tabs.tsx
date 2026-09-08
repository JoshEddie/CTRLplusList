'use client';

import type { KeyboardEvent } from 'react';
import { TabStrip } from './TabStrip';
import type { TabsProps } from './types';

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  size,
  className,
  'aria-label': ariaLabel,
}: TabsProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const current = Math.max(
      items.findIndex((item) => item.value === value),
      0
    );
    const nextIndex = (current + step + items.length) % items.length;
    const next = items[nextIndex];
    onChange(next.value);
    event.currentTarget
      .querySelectorAll<HTMLElement>('[role="tab"]')
      [nextIndex]?.focus();
  };

  return (
    <TabStrip
      role="tablist"
      size={size}
      className={className}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            id={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={item.panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </TabStrip>
  );
}
