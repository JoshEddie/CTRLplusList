import type { ReactNode } from 'react';

interface FieldErrorProps {
  id?: string;
  children?: ReactNode;
}

export function FieldError({ id, children }: FieldErrorProps) {
  if (!children) return null;
  return (
    <p id={id} className="field_error">
      {children}
    </p>
  );
}
