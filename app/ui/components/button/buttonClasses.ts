import type { ButtonSize, ButtonVariant } from './types';

export function buttonClasses({
  variant,
  size = 'md',
  extra,
}: {
  variant: ButtonVariant;
  size?: ButtonSize;
  extra?: string;
}): string {
  return ['btn', variant, size === 'sm' && 'btn-sm', extra]
    .filter(Boolean)
    .join(' ');
}
