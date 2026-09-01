'use client';

import type { ProfileMemberRow } from '@/lib/data/profile.members';
import {
  setMemberTier,
  setProfileSpoilerDefault,
} from '@/lib/data/profile.spoilers.actions';
import type { SpoilerTier } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { MdExpandLess, MdExpandMore } from 'react-icons/md';
import toast from 'react-hot-toast';
import ClaimVisibilityFields, { tierLabel } from './ClaimVisibilityFields';

export const OWN_CONTROL_LABEL = 'What you see on this profile';
export const DEFAULT_CONTROL_LABEL = 'Default for new members';

type Save = (
  next: SpoilerTier
) => Promise<{ success: boolean; message: string }>;

// Optimistic, with the previous value held so a refusal puts the control back
// where it was rather than leaving it showing a state that was never written.
function useBaselineEditor(initial: SpoilerTier, save: Save) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const commit = (next: SpoilerTier) => {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await save(next);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        setValue(previous);
        toast.error(result.message);
      }
    });
  };

  return { value, isPending, commit };
}

// The one control the viewer came for, and the only one their role never
// forbids. Open, unlabelled by anyone else's name, and above the rows they
// merely administer.
function OwnBaseline({ initial, save }: { initial: SpoilerTier; save: Save }) {
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

// Collapsed by default: a profile with many members would otherwise be a wall
// of identical control sets. The summary carries the tier so the closed row
// still answers what it is set to.
function CollapsedBaseline({
  title,
  label,
  hint,
  initial,
  disabled,
  save,
}: {
  title: string;
  label: string;
  hint?: string;
  initial: SpoilerTier;
  disabled: boolean;
  save: Save;
}) {
  const { value, isPending, commit } = useBaselineEditor(initial, save);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="claim-visibility-row">
      <button
        type="button"
        className="claim-visibility-trigger"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="claim-visibility-row-title">{title}</span>
        <span className="claim-visibility-row-summary">{tierLabel(value)}</span>
        {expanded ? <MdExpandLess aria-hidden /> : <MdExpandMore aria-hidden />}
      </button>
      {expanded && (
        <div className="claim-visibility-row-body">
          {hint && <p className="claim-visibility-hint">{hint}</p>}
          <ClaimVisibilityFields
            value={value}
            disabled={disabled || isPending}
            label={label}
            onChange={commit}
          />
        </div>
      )}
    </div>
  );
}

// Gated per control, not per panel: a member's own baseline is theirs whatever
// their role, while the profile default and everyone else's take the `owner`
// floor and render disabled rather than absent. The disabled control is never
// the enforcement — the actions refuse independently.
export default function ClaimVisibilitySection({
  profileId,
  members,
  profileDefault,
  viewerUserId,
  viewerIsOwner,
}: {
  profileId: string;
  members: ProfileMemberRow[];
  profileDefault: SpoilerTier;
  viewerUserId: string;
  viewerIsOwner: boolean;
}) {
  const own = members.find((member) => member.user_id === viewerUserId);
  const others = members.filter((member) => member.user_id !== viewerUserId);

  return (
    <section className="claim-visibility">
      {own && (
        <OwnBaseline
          initial={own.baseline}
          save={(next) => setMemberTier(profileId, own.user_id, next)}
        />
      )}

      <div className="claim-visibility-administered">
        <CollapsedBaseline
          title={DEFAULT_CONTROL_LABEL}
          label={DEFAULT_CONTROL_LABEL}
          // A seed, never a parent.
          hint="Where a new member starts. Changing it leaves everyone already on this profile exactly where they are."
          initial={profileDefault}
          disabled={!viewerIsOwner}
          save={(next) => setProfileSpoilerDefault(profileId, next)}
        />

        {others.map((member) => (
          <CollapsedBaseline
            key={member.user_id}
            title={member.name}
            label={`Claim visibility for ${member.name}`}
            initial={member.baseline}
            disabled={!viewerIsOwner}
            save={(next) => setMemberTier(profileId, member.user_id, next)}
          />
        ))}
      </div>
    </section>
  );
}
