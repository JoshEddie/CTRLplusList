import type { ButtonSize, ButtonVariant, ButtonWidth } from './types';

export function buttonClasses({
  variant,
  size = 'md',
  width,
  icon,
  extra,
}: {
  variant: ButtonVariant;
  size?: ButtonSize;
  width?: ButtonWidth;
  icon?: boolean;
  extra?: string;
}): string {
  return [
    'btn',
    variant,
    size === 'sm' && 'btn-sm',
    icon && 'btn-icon',
    extra,
    width === 'full' && 'full',
  ]
    .filter(Boolean)
    .join(' ');
}
