'use client';

import {
  forwardRef,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { MdClose, MdSearch } from 'react-icons/md';
import './form-field.css';
import './search-field.css';

type InputAttrs = Omit<
  ComponentPropsWithRef<'input'>,
  'className' | 'type' | 'id'
>;

type SearchFieldOwnProps = {
  className?: string;
};

type SearchFieldVariant =
  | { onClear?: () => void; trailing?: never }
  | { onClear?: never; trailing?: ReactNode };

type SearchFieldProps = SearchFieldOwnProps & InputAttrs & SearchFieldVariant;

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ className, onClear, trailing, value, ...inputProps }, ref) {
    const hasTrailingNode = trailing !== undefined && trailing !== null;
    const hasClearButton =
      onClear !== undefined && value !== undefined && value !== '';
    const showTrailing = hasTrailingNode || hasClearButton;

    const classes = [
      'form_field',
      'search_field',
      !showTrailing && 'no_trailing',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={classes}>
        <span className="field_icon">
          <MdSearch aria-hidden="true" />
        </span>
        <input
          ref={ref}
          type="search"
          className="form_field_input"
          value={value}
          {...inputProps}
        />
        {hasTrailingNode && trailing}
        {!hasTrailingNode && hasClearButton && (
          <button
            type="button"
            className="search_field_clear"
            onClick={onClear}
            aria-label="Clear search"
          >
            <MdClose aria-hidden="true" />
          </button>
        )}
      </div>
    );
  },
);

SearchField.displayName = 'SearchField';
