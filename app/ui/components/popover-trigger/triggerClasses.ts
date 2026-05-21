export function triggerClasses({
  active,
  extra,
}: {
  active?: boolean;
  extra?: string;
}): string {
  return ['popover-trigger', active && 'active', extra]
    .filter(Boolean)
    .join(' ');
}
