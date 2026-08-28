'use client';

import AltvatarCustomizer, {
  type AltvatarDraft,
} from '@/app/ui/components/altvatar/AltvatarCustomizer';
import AltvatarPreview from '@/app/ui/components/altvatar/AltvatarPreview';
import { Button } from '@/app/ui/components/button';
import '@/app/ui/components/field/form-field.css';
import '@/app/ui/styles/altvatar.css';
import { accentVars } from '@/lib/accent';
import { useState } from 'react';

// The Altvatar as a host form's input: the face and accent it holds, and the
// control that opens the customizer over both. The host owns the value — the
// customizer hands one back and writes nothing itself.
//
// One field rather than two, because accent and face are one identity edited in
// one place: `profiles-surface` fixes that no separate accent field renders
// beside this one.
export default function AltvatarField({
  value,
  onChange,
  name,
  description,
}: {
  value: AltvatarDraft;
  onChange: (draft: AltvatarDraft) => void;
  name?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="form_field_group">
      <span className="form_field_label">Altvatar</span>
      {description && <p className="form_field_description">{description}</p>}
      <div className="altvatar-field" style={accentVars(value.accent)}>
        <AltvatarPreview
          styleId={value.style}
          options={value.options}
          accent={value.accent}
        />
        <div className="altvatar-field-detail">
          {name && <span className="altvatar-field-name">{name}</span>}
          <Button variant="primary" onClick={() => setOpen(true)}>
            Edit Altvatar
          </Button>
        </div>
      </div>
      {open && (
        <AltvatarCustomizer
          value={value}
          onConfirm={(draft) => {
            onChange(draft);
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  );
}
