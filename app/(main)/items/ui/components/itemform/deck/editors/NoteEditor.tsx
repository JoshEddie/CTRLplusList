'use client';

import { TextareaField } from '@/app/ui/components/field';
import { DESCRIPTION_MAX } from '../utils';

interface NoteEditorProps {
  description: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Steering copy; differs inline-under-a-long-title vs the standalone card. */
  helper?: string;
}

export function NoteEditor({
  description,
  onChange,
  disabled,
  helper,
}: NoteEditorProps) {
  const over = description.length > DESCRIPTION_MAX;
  return (
    <div className="deck-note">
      <TextareaField
        label="Description"
        description={helper}
        value={description}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        maxLength={DESCRIPTION_MAX}
        placeholder="Short and specific — a size, color, or detail that matters."
        error={
          over
            ? `Description must be ${DESCRIPTION_MAX} characters or fewer — trim it to save.`
            : undefined
        }
      />
      <span
        className={`deck-counter${over ? ' deck-counter-error' : ''}`}
        aria-hidden="true"
      >
        {description.length}/{DESCRIPTION_MAX}
      </span>
    </div>
  );
}
