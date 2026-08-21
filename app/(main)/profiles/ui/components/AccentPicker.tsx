'use client';

import '@/app/ui/components/field/form-field.css';
import { ACCENT_NAMES, accentVars } from '@/lib/accent';
import { useId } from 'react';

// Native radios rather than a custom widget: arrow-key navigation, checked
// semantics and disabled all come from the platform. Only the presets are
// offered — the no-accent fallback is what a profile with no stored accent looks
// like, not a seventh choice.
//
// TODO(#313): the legend hand-copies FormField's label markup. Imported here so
// the typography does not depend on a sibling <TextField> loading the same
// stylesheet, but the markup can still drift from the primitive it mirrors.
// #313 authors the radio-group field that would own both.
export default function AccentPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (accent: string) => void;
  disabled?: boolean;
}) {
  const name = useId();

  return (
    <fieldset className="profile-accent-picker" disabled={disabled}>
      <legend className="form_field_label">
        Accent
        <span className="required_indicator" aria-hidden="true">
          {' *'}
        </span>
        {/* The stored value is the preset's name, so naming the selection is
            showing what is actually saved, not a label invented for the UI. */}
        <span className="profile-accent-selected">{value}</span>
      </legend>
      <div className="profile-accent-options">
        {ACCENT_NAMES.map((accent) => (
          // The ring is the preset's own ink, so the selected swatch is marked
          // in a colour that belongs to it rather than a brand one sitting
          // against whatever hue it happens to be.
          <label
            key={accent}
            className="profile-accent-option"
            style={accentVars(accent)}
          >
            <input
              type="radio"
              name={name}
              value={accent}
              checked={value === accent}
              onChange={() => onChange(accent)}
              className="profile-accent-input sr-only"
            />
            <span className="sr-only">{accent}</span>
            <span className="profile-accent-swatch" aria-hidden />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
