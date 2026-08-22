'use client';

import { TextareaField } from '@/app/ui/components/field';
import { useState } from 'react';
import { TierNote } from '../TierNote';
import { TrimChip } from '../TrimChip';
import { NAME_MAX, suggestTrim, nameTier } from '../utils';
import { NoteEditor } from './NoteEditor';

interface NameEditorProps {
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  linkless?: boolean;
  disabled?: boolean;
}

export function NameEditor({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  linkless,
  disabled,
}: NameEditorProps) {
  const tier = nameTier(name);
  const suggestion = suggestTrim(name);
  const canTrim =
    tier.tier !== 'good' && suggestion.length > 0 && suggestion !== name.trim();

  // Latch the inline note open once it's been surfaced (the title started
  // flagged): trimming the name back to "good" must NOT yank away the note
  // field — surfacing it is the whole point, so the user can move the
  // size/color/variant detail there before continuing.
  const [noteSurfaced] = useState(() => nameTier(name).tier !== 'good');

  return (
    <div className="deck-name">
      <TextareaField
        label="Item name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={disabled}
        rows={2}
        placeholder="What is it?"
        autoComplete="off"
        counterMax={NAME_MAX}
        invalid={tier.tier === 'error'}
      />

      {tier.tier === 'warn' && <TierNote tier="warn">{tier.note}</TierNote>}
      {tier.tier === 'error' && <TierNote tier="error">{tier.note}</TierNote>}

      {canTrim && (
        <TrimChip
          suggestion={suggestion}
          onApply={() => onNameChange(suggestion)}
          disabled={disabled}
        />
      )}

      {noteSurfaced && (
        <NoteEditor
          description={description}
          onChange={onDescriptionChange}
          disabled={disabled}
          helper={
            linkless
              ? 'Optional — size, color, or any detail worth remembering.'
              : 'Move size, color, or variant details here so the name stays short.'
          }
        />
      )}
    </div>
  );
}
