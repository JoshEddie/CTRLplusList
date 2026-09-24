'use client';

import type { ProfileMemberRow } from '@/lib/data/profile.members';
import {
  setMemberTier,
  setProfileSpoilerDefault,
} from '@/lib/data/profile.spoilers.actions';
import type { SpoilerTier } from '@/lib/types';
import CollapsedBaseline from './CollapsedBaseline';
import OwnBaseline from './OwnBaseline';

export const DEFAULT_CONTROL_LABEL = 'Default for new members';

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
