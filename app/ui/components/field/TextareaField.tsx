import { forwardRef, type ComponentPropsWithRef } from 'react';
import { FormField } from './FormField';
import type { FieldWrapperProps } from './types';

type TextareaFieldProps = FieldWrapperProps & {
  className?: string;
  /** Enable the field-owned character counter (`length/max`). Does not clamp
   *  input — pair with native `maxLength` when clamping is wanted. */
  counterMax?: number;
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
    invalid,
    required,
    disabled,
    icon,
    iconPosition,
    className,
    counterMax,
    ...textareaProps
  },
  ref
) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      invalid={invalid}
      required={required}
      disabled={disabled}
      icon={icon}
      iconPosition={iconPosition}
      className={className}
      counter={
        counterMax === undefined
          ? undefined
          : {
              length: String(textareaProps.value ?? '').length,
              max: counterMax,
            }
      }
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
