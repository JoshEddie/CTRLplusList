import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
} from 'react';
import { FieldError } from './FieldError';
import './form-field.css';
import type { FormFieldProps } from './types';

const KNOWN_CHILD_DISPLAY_NAMES = new Set([
  'TextField',
  'TextareaField',
  'SelectField',
  'DateField',
  'DatalistField',
  'PriceField',
]);

interface InjectedChildProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

/**
 * Chrome owner for every standard field primitive. Internal — callers use
 * <TextField>, <SelectField>, etc. (see app/ui/components/field/index.ts).
 *
 * Owns the visual chrome via `<div class="form_field">` (border, background,
 * focus-within ring, min-height). Owns the useId-driven label/input/
 * description/error association so callers cannot hand-wire it wrong.
 */
export function FormField({
  label,
  description,
  error,
  required,
  icon,
  iconPosition = 'left',
  className,
  children,
  size,
}: FormFieldProps) {
  const reactId = useId();
  const inputId = `${reactId}-input`;
  const descriptionId = description ? `${reactId}-description` : undefined;
  const errorId = error ? `${reactId}-error` : undefined;

  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const child = Children.only(children);

  let enrichedChild = child;
  if (isValidElement(child)) {
    if (process.env.NODE_ENV !== 'production') {
      const displayName = (child.type as { displayName?: string }).displayName;
      if (displayName && !KNOWN_CHILD_DISPLAY_NAMES.has(displayName)) {
        console.error(
          `<FormField> received unexpected child <${displayName}>. Use a field-type wrapper (TextField, SelectField, etc.).`
        );
      }
    }
    enrichedChild = cloneElement(child as ReactElement<InjectedChildProps>, {
      id: inputId,
      'aria-describedby': describedBy,
      'aria-invalid': error ? true : undefined,
      'aria-required': required ? true : undefined,
    });
  }

  const hasIcon = icon !== undefined;
  const iconClass = hasIcon
    ? iconPosition === 'right'
      ? 'icon_right'
      : 'icon_left'
    : '';
  const sizeClass = size === 'sm' ? 'form_field-sm' : '';
  const invalidClass = error ? 'invalid' : '';
  const fieldClass = ['form_field', iconClass, invalidClass, sizeClass]
    .filter(Boolean)
    .join(' ');

  const fieldRow = (
    <div className={fieldClass}>
      {hasIcon && iconPosition !== 'right' && (
        <span className="field_icon">{icon}</span>
      )}
      {enrichedChild}
      {hasIcon && iconPosition === 'right' && (
        <span className="field_icon">{icon}</span>
      )}
    </div>
  );

  return (
    <div className={['form_field_group', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="form_field_label" htmlFor={inputId}>
          {label}
          {required && (
            <span className="required_indicator" aria-hidden="true">
              {' *'}
            </span>
          )}
        </label>
      )}
      {description && (
        <p id={descriptionId} className="form_field_description">
          {description}
        </p>
      )}
      {fieldRow}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
