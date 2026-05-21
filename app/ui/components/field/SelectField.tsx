import { forwardRef, type ComponentPropsWithRef, type ReactNode } from 'react';
import { FormField } from './FormField';
import type { FieldWrapperProps, FormSize } from './types';

interface SelectOption {
  value: string | number;
  label: string;
}

type SelectFieldProps = FieldWrapperProps & {
  className?: string;
  options?: SelectOption[];
  children?: ReactNode;
  fieldSize?: FormSize;
} & Omit<
    ComponentPropsWithRef<'select'>,
    'className' | 'disabled' | 'id' | 'children' | 'aria-invalid' | 'aria-required' | 'aria-describedby'
  >;

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    {
      label,
      description,
      error,
      required,
      disabled,
      icon,
      iconPosition,
      className,
      options,
      children,
      fieldSize,
      ...selectProps
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
        size={fieldSize}
      >
        <select
          ref={ref}
          className="form_field_select"
          disabled={disabled}
          {...selectProps}
        >
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
      </FormField>
    );
  },
);

SelectField.displayName = 'SelectField';
