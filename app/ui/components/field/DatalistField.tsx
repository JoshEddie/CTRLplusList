import {
  forwardRef,
  useId,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { FormField } from './FormField';
import type { FieldWrapperProps } from './types';

type DatalistFieldProps = FieldWrapperProps & {
  className?: string;
  options: ReactNode;
} & Omit<
    ComponentPropsWithRef<'input'>,
    | 'className'
    | 'disabled'
    | 'type'
    | 'list'
    | 'id'
    | 'aria-invalid'
    | 'aria-required'
    | 'aria-describedby'
  >;

export const DatalistField = forwardRef<HTMLInputElement, DatalistFieldProps>(
  function DatalistField(
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
      ...inputProps
    },
    ref
  ) {
    const listId = useId();
    return (
      <>
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
            type="text"
            list={listId}
            className="form_field_input"
            disabled={disabled}
            {...inputProps}
          />
        </FormField>
        <datalist id={listId}>{options}</datalist>
      </>
    );
  }
);

DatalistField.displayName = 'DatalistField';
