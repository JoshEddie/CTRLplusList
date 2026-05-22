import { forwardRef, type ComponentPropsWithRef } from 'react';
import { FormField } from './FormField';
import type { FieldWrapperProps } from './types';

type TextareaFieldProps = FieldWrapperProps & {
  className?: string;
} & Omit<
    ComponentPropsWithRef<'textarea'>,
    | 'className'
    | 'disabled'
    | 'id'
    | 'aria-invalid'
    | 'aria-required'
    | 'aria-describedby'
  >;

export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(function TextareaField(
  {
    label,
    description,
    error,
    required,
    disabled,
    icon,
    iconPosition,
    className,
    ...textareaProps
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
      <textarea
        ref={ref}
        className="form_field_textarea"
        disabled={disabled}
        {...textareaProps}
      />
    </FormField>
  );
});

TextareaField.displayName = 'TextareaField';
