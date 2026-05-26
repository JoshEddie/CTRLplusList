import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import { FieldError } from './FieldError';
import './form-field.css';
import type { FieldIconPosition, FormFieldProps } from './types';

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

function warnOnUnknownChild(child: ReactElement) {
  if (process.env.NODE_ENV !== 'production') {
    const displayName = (child.type as { displayName?: string }).displayName;
    if (displayName && !KNOWN_CHILD_DISPLAY_NAMES.has(displayName)) {
      console.error(
        `<FormField> received unexpected child <${displayName}>. Use a field-type wrapper (TextField, SelectField, etc.).`
      );
    }
  }
}

function iconClassFor(hasIcon: boolean, iconPosition: FieldIconPosition) {
  if (!hasIcon) return '';
  return iconPosition === 'right' ? 'icon_right' : 'icon_left';
}

function joinClasses(...tokens: (string | undefined | false)[]) {
  return tokens.filter(Boolean).join(' ');
}

function FieldRow({
  fieldClass,
  icon,
  iconPosition,
  hasIcon,
  child,
}: {
  fieldClass: string;
  icon: ReactNode;
  iconPosition: FieldIconPosition;
  hasIcon: boolean;
  child: ReactNode;
}) {
  const leadingIcon = hasIcon && iconPosition !== 'right';
  const trailingIcon = hasIcon && iconPosition === 'right';
  return (
    <div className={fieldClass}>
      {leadingIcon && <span className="field_icon">{icon}</span>}
      {child}
      {trailingIcon && <span className="field_icon">{icon}</span>}
    </div>
  );
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
    joinClasses(descriptionId, errorId) || undefined;

  const child = Children.only(children);

  let enrichedChild = child;
  if (isValidElement(child)) {
    warnOnUnknownChild(child);
    enrichedChild = cloneElement(child as ReactElement<InjectedChildProps>, {
      id: inputId,
      'aria-describedby': describedBy,
      'aria-invalid': error ? true : undefined,
      'aria-required': required ? true : undefined,
    });
  }

  const hasIcon = icon !== undefined;
  const fieldClass = joinClasses(
    'form_field',
    iconClassFor(hasIcon, iconPosition),
    error && 'invalid',
    size === 'sm' && 'form_field-sm'
  );

  return (
    <div className={joinClasses('form_field_group', className)}>
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
      <FieldRow
        fieldClass={fieldClass}
        icon={icon}
        iconPosition={iconPosition}
        hasIcon={hasIcon}
        child={enrichedChild}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
