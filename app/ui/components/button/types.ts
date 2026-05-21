export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'on-dark';

export type ButtonSize = 'sm' | 'md';

export interface SharedButtonProps {
  variant: ButtonVariant;
  size?: ButtonSize;
  pressed?: boolean;
}
