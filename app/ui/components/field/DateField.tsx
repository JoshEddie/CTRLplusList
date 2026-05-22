import { forwardRef, type ComponentPropsWithRef } from 'react';
import { FormField } from './FormField';
import type { FieldWrapperProps } from './types';

type DateFieldProps = FieldWrapperProps & {
  className?: string;
} & Omit<
    ComponentPropsWithRef<'input'>,
    | 'className'
    | 'disabled'
    | 'type'
    | 'id'
    | 'aria-invalid'
    | 'aria-required'
    | 'aria-describedby'
  >;

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  function DateField(
    {
      label,
      description,
      error,
      required,
      disabled,
      icon,
      iconPosition,
      className,
      ...inputProps
    },
    ref
  ) {
    return (
      <FormField
        label={label}
        description={description}
        error={error}
        required={required}
        disabled={disabled}
        icon={icon}
        iconPosition={iconPosition}
        className={className}
      >
        <input
          ref={ref}
          type="date"
          className="form_field_input"
          disabled={disabled}
          {...inputProps}
        />
      </FormField>
    );
  }
);

DateField.displayName = 'DateField';
