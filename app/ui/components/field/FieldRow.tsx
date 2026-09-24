import type { ReactNode } from 'react';
import type { FieldIconPosition } from './types';

export function FieldRow({
  fieldClass,
  icon,
  iconPosition,
  hasIcon,
  child,
  trailing,
}: {
  fieldClass: string;
  icon: ReactNode;
  iconPosition: FieldIconPosition;
  hasIcon: boolean;
  child: ReactNode;
  trailing?: ReactNode;
}) {
  const leadingIcon = hasIcon && iconPosition !== 'right';
  const trailingIcon = hasIcon && iconPosition === 'right';
  return (
    <div className={fieldClass}>
      {leadingIcon && <span className="field_icon">{icon}</span>}
      {child}
      {trailingIcon && <span className="field_icon">{icon}</span>}
      {trailing}
    </div>
  );
}
