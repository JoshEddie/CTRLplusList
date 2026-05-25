import { forwardRef, type ComponentPropsWithRef } from 'react';
import './form-field.css';

type CheckboxFieldProps = {
  label: string;
  className?: string;
} & Omit<ComponentPropsWithRef<'input'>, 'className' | 'type'>;

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  function CheckboxField({ label, className, ...inputProps }, ref) {
    const classes = ['checkbox_field', className].filter(Boolean).join(' ');
    return (
      <label className={classes}>
        <input
          ref={ref}
          type="checkbox"
          className="checkbox_field_box"
          {...inputProps}
        />
        <span>{label}</span>
      </label>
    );
  }
);

CheckboxField.displayName = 'CheckboxField';
