'use client';

import ListDetailsFields from '@/app/(main)/lists/ui/components/ListDetailsFields';
import ListHeroSurface from '@/app/(main)/lists/ui/components/ListHeroSurface';
import { dateFieldError } from '@/app/(main)/lists/ui/components/utils';
import type { ListDetailsDraft } from './editModeChanges';

// The mode's band replaces the hero, so it reuses the hero's own surface: the
// collapse behaviour, the sticky pin and the keyboard-quiet window are all
// already tuned there, and the collapsed strip carries the staged name so a
// rename shows through while the fields are scrolled away.
export default function EditModeHeader({
  draft,
  onChange,
  disabled,
}: {
  draft: ListDetailsDraft;
  onChange: (patch: Partial<ListDetailsDraft>) => void;
  disabled: boolean;
}) {
  return (
    <ListHeroSurface title={draft.name} kebab={null}>
      <div className="list-edit-hero">
        <ListDetailsFields
          draft={draft}
          onChange={onChange}
          disabled={disabled}
          dateError={dateFieldError(draft.date) ?? undefined}
        />
      </div>
    </ListHeroSurface>
  );
}
