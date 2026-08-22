import type { ReactNode } from 'react';

export type FieldIconPosition = 'left' | 'right';
export type FormSize = 'sm' | 'md';

export interface FieldWrapperBase {
  label?: string;
  description?: ReactNode;
  error?: string;
  /** Mark the field invalid without rendering a message — for surfaces whose
   *  human-readable message lives outside the field (e.g. the deck's
   *  TierNote). `error` implies invalid; `invalid` alone adds `aria-invalid`
   *  and the `.invalid` chrome only. */
  invalid?: boolean;
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
  /** Field-owned character counter (`length/max`), rendered under the field
   *  and error-colored past `max` or while the field is invalid. */
  counter?: { length: number; max: number };
  children: ReactNode;
}
