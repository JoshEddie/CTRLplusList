import type { PopoverTriggerTone } from './types';

export function triggerClasses({
  active,
  tone = 'light',
  extra,
}: {
  active?: boolean;
  tone?: PopoverTriggerTone;
  extra?: string;
} = {}): string {
  return [
    'popover-trigger',
    tone === 'on-dark' && 'tone-on-dark',
    active && 'active',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}
