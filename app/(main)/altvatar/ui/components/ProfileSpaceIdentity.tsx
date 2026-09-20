'use client';

import type { AltvatarDraft } from '@/app/ui/components/altvatar/AltvatarCustomizer';
import AltvatarPreview from '@/app/ui/components/altvatar/AltvatarPreview';
import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { accentVars } from '@/lib/accent';
import { LuPencil } from 'react-icons/lu';
import type { ProfileCardView } from '@/lib/types';

// The space's own head IS the live preview: it takes the form's current
// Altvatar and accent rather than the stored ones, so editing repaints the
// band and the disc in place. Name and tagline stay as stored — an in-progress
// rename would otherwise blank the page's `<h1>` between keystrokes.
export default function ProfileSpaceIdentity({
  profile,
  altvatar,
  onEdit,
  editDisabled,
  actions,
}: {
  profile: ProfileCardView;
  /** The form's live values, where the viewer has any. Null falls back to what
      the profile actually holds — a viewer who cannot save is shown the stored
      identity rather than a suggestion. */
  altvatar: AltvatarDraft | null;
  onEdit: () => void;
  /** A manager holds no identity edit. The affordance stays, disabled, so the
      surface states the capability exists and that they do not hold it. */
  editDisabled?: boolean;
  /** Right-aligned header slot, sharing the public profile header's layout so
      a profile reads the same whether it is being administered or visited. */
  actions?: React.ReactNode;
}) {
  const accent = altvatar?.accent ?? profile.accent;
  const disc = altvatar ? (
    <AltvatarPreview
      styleId={altvatar.style}
      options={altvatar.options}
      accent={altvatar.accent}
    />
  ) : (
    <ProfileAvatar profile={profile} />
  );

  return (
    <>
      <div className="profile-space-band" style={accentVars(accent)}>
        <button
          type="button"
          className="profile-space-avatar profile-space-avatar-edit"
          onClick={onEdit}
          disabled={editDisabled}
          aria-label="Edit Altvatar"
        >
          {disc}
          {/* The disc alone says nothing about being editable — a hover state
              is invisible on a touch screen and on first look. The badge is
              the callout; the whole disc stays the target. */}
          <span className="profile-space-avatar-badge" aria-hidden>
            <LuPencil />
          </span>
        </button>
      </div>
      <div className="profile-space-identity profile-header">
        <div className="profile-meta">
          <h1 className="profile-space-name">{profile.name}</h1>
          {profile.tagline && (
            <p className="profile-space-tagline">{profile.tagline}</p>
          )}
        </div>
        {actions && <div className="profile-actions">{actions}</div>}
      </div>
    </>
  );
}
