import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface PopoverTriggerOwnProps {
  icon?: ReactNode;
  label: ReactNode;
  count?: number;
  active?: boolean;
}

export type PopoverTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> &
  PopoverTriggerOwnProps;
