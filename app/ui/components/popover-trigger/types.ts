import { ButtonHTMLAttributes, ReactNode } from 'react';

export type PopoverTriggerTone = 'light' | 'on-dark';

export interface PopoverTriggerOwnProps {
  icon?: ReactNode;
  label: ReactNode;
  count?: number;
  active?: boolean;
  tone?: PopoverTriggerTone;
}

export type PopoverTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> &
  PopoverTriggerOwnProps;
