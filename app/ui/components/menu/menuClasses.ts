import type { MenuItemTone } from './types';

export function menuItemClasses({
  tone = 'default',
  extra,
}: {
  tone?: MenuItemTone;
  extra?: string;
}): string {
  return ['menu-item', tone === 'danger' && 'tone-danger', extra]
    .filter(Boolean)
    .join(' ');
}
