import type { ReactNode } from 'react';

export type FieldIconPosition = 'left' | 'right';
export type FormSize = 'sm' | 'md';

export interface FieldWrapperBase {
  label?: string;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: FormSize;
}

export interface FieldWrapperProps extends FieldWrapperBase {
  icon?: ReactNode;
  iconPosition?: FieldIconPosition;
}

export interface FormFieldProps extends FieldWrapperProps {
  /** Layout-only class applied to the outer wrapper div. Never use this to override chrome. */
  className?: string;
  children: ReactNode;
}
