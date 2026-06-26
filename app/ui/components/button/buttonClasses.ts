import type { ButtonSize, ButtonVariant, ButtonWidth } from './types';

export function buttonClasses({
  variant,
  size = 'md',
  width,
  extra
}: {
  variant: ButtonVariant;
  size?: ButtonSize;
  width?: ButtonWidth
  extra?: string;
}): string {
  return ['btn', variant, size === 'sm' && 'btn-sm', extra, width]
    .filter(Boolean)
    .join(' ');
}
