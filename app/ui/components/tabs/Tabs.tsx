'use client';

import Link from 'next/link';
import type { KeyboardEvent } from 'react';
import type { TabsProps, TabsSize } from './types';
import './tabs.css';

function stripClasses(size: TabsSize, extra?: string): string {
  return ['tabs', `tabs--${size}`, extra].filter(Boolean).join(' ');
}

function tabClasses(active: boolean): string {
  return active ? 'tabs-tab tabs-tab--active' : 'tabs-tab';
}

export function Tabs<T extends string>(props: TabsProps<T>) {
  const size = props.size ?? 'default';
  const className = stripClasses(size, props.className);
  const ariaLabel = props['aria-label'];

  if ('activeHref' in props) {
    return (
      <nav className={className} aria-label={ariaLabel}>
        {props.items.map((item) => {
          const active = item.href === props.activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={tabClasses(active)}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  const { items, value, onChange } = props;

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
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={className}
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
            className={tabClasses(active)}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
