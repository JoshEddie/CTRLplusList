'use client';

import { TextField } from '@/app/ui/components/field';
import { TierNote } from '../TierNote';
import { storeTier } from '../utils';

interface StoreEditorProps {
  name: string;
  link: string;
  onNameChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  disabled?: boolean;
}

// The grouped Store editor: name + link as one two-field surface (the price
// belongs solely to the price editor). No add/remove-store affordances — an
// item carries exactly one store (item-store-links).
export function StoreEditor({
  name,
  link,
  onNameChange,
  onLinkChange,
  disabled,
}: StoreEditorProps) {
  const tier = storeTier({ name, link });

  return (
    <div className="deck-store">
      <TextField
        label="Store name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={disabled}
        placeholder="e.g. Amazon"
      />
      <TextField
        type="url"
        label="Link"
        value={link}
        onChange={(e) => onLinkChange(e.target.value)}
        disabled={disabled}
        placeholder="https://…"
      />
      {tier.tier === 'error' && <TierNote tier="error">{tier.note}</TierNote>}
    </div>
  );
}
