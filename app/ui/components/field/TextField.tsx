import { forwardRef, type ComponentPropsWithRef } from 'react';
import { FormField } from './FormField';
import type { FieldWrapperProps } from './types';

type TextInputType =
  | 'text'
  | 'email'
  | 'url'
  | 'tel'
  | 'password'
  | 'search'
  | 'number';

type TextFieldProps = FieldWrapperProps & {
  type?: TextInputType;
  /** Layout-only class on the outer wrapper (never the input). */
  className?: string;
} & Omit<
    ComponentPropsWithRef<'input'>,
    'className' | 'disabled' | 'type' | 'id' | 'aria-invalid' | 'aria-required' | 'aria-describedby'
  >;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      description,
      error,
      required,
      disabled,
      icon,
      iconPosition,
      type = 'text',
      className,
      ...inputProps
    },
    ref,
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
          type={type}
          className="form_field_input"
          disabled={disabled}
          {...inputProps}
        />
      </FormField>
    );
  },
);

TextField.displayName = 'TextField';
