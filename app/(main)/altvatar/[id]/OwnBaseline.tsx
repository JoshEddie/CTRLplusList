'use client';

import type { SpoilerTier } from '@/lib/types';
import ClaimVisibilityFields from './ClaimVisibilityFields';
import { useBaselineEditor, type Save } from './utils';

export const OWN_CONTROL_LABEL = 'What you see on this profile';

// The one control the viewer came for, and the only one their role never
// forbids. Open, unlabelled by anyone else's name, and above the rows they
// merely administer.
export default function OwnBaseline({
  initial,
  save,
}: {
  initial: SpoilerTier;
  save: Save;
}) {
  const { value, isPending, commit } = useBaselineEditor(initial, save);
  return (
    <div className="claim-visibility-own">
      <p className="claim-visibility-label">{OWN_CONTROL_LABEL}</p>
      <p className="claim-visibility-hint">
        This is yours alone. Nobody else on this profile sees it, and it follows
        you here whichever profile you are acting as.
      </p>
      <ClaimVisibilityFields
        value={value}
        disabled={isPending}
        label={OWN_CONTROL_LABEL}
        onChange={commit}
      />
    </div>
  );
}
