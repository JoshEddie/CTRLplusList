'use client';

import { DatalistField, DateField, TextField } from '@/app/ui/components/field';
import { getMessage } from '@/lib/i18n/utils';
import type { ListDetailsDraft } from '../../[id]/editModeChanges';
import { COMMON_OCCASIONS } from './utils';

// The whole of what a list row holds, controlled. Both surfaces that edit a
// list render this one block — the create/edit form and the mode's band — so
// the fields, their bounds and their copy have a single home.
export default function ListDetailsFields({
  draft,
  onChange,
  disabled,
  dateError,
}: {
  draft: ListDetailsDraft;
  onChange: (patch: Partial<ListDetailsDraft>) => void;
  disabled?: boolean;
  dateError?: string;
}) {
  return (
    <>
      <TextField
        label={getMessage('list_name_label')}
        required
        name="name"
        value={draft.name}
        onChange={(e) => onChange({ name: e.target.value })}
        disabled={disabled}
      />
      <TextField
        label={getMessage('list_subtitle_label')}
        name="subtitle"
        value={draft.subtitle}
        onChange={(e) => onChange({ subtitle: e.target.value })}
        disabled={disabled}
        placeholder={getMessage('list_subtitle_placeholder')}
        maxLength={120}
      />
      <DatalistField
        label={getMessage('list_occasion_label')}
        name="occasion"
        value={draft.occasion}
        onChange={(e) => onChange({ occasion: e.target.value })}
        disabled={disabled}
        placeholder={getMessage('list_occasion_placeholder')}
        autoComplete="off"
        options={COMMON_OCCASIONS.map((o) => (
          <option key={o} value={o} />
        ))}
      />
      <DateField
        label={getMessage('list_date_label')}
        required
        name="date"
        value={draft.date}
        onChange={(e) => onChange({ date: e.target.value })}
        disabled={disabled}
        min="1900-01-01"
        max="9999-12-31"
        error={dateError}
      />
    </>
  );
}
