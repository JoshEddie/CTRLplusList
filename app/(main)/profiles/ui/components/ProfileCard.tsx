import { initialsOf } from '@/app/(main)/users/ui/utils';
import { accentVars } from '@/lib/accent';
import type { ProfileCardView } from '@/lib/types';
import ProfileCardMenu from './ProfileCardMenu';

const ROLE_LABEL: Record<ProfileCardView['role'], string> = {
  self: 'You',
  owner: 'Owner',
  manager: 'Manager',
};

function countsText({ listCount, itemCount }: ProfileCardView): string {
  const lists = `${listCount} ${listCount === 1 ? 'list' : 'lists'}`;
  const items = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  return `${lists} · ${items}`;
}

// The avatar is a slot: #199 fills the disc with the profile's Altvatar, and
// until then it paints the accent's light stop behind the initials fallback.
export default function ProfileCard({ profile }: { profile: ProfileCardView }) {
  // There is exactly one active profile at all times, and it is the viewer's
  // own until #193 makes it switchable — so the role IS the active state.
  const isActive = profile.role === 'self';

  return (
    <div
      className={`profile-card${isActive ? ' is-active' : ''}`}
      style={accentVars(profile.accent)}
    >
      <div className="profile-card-band">
        <ProfileCardMenu profileId={profile.id} profileName={profile.name} />
        <span className="profile-card-avatar" aria-hidden>
          {initialsOf(profile.name)}
        </span>
        {isActive && (
          <span className="profile-card-active">
            <span aria-hidden>✓</span>
            <span className="sr-only">Active profile</span>
          </span>
        )}
      </div>
      <div className="profile-card-body">
        <div className="profile-card-heading">
          <span className="profile-card-name">{profile.name}</span>
          <span
            className={`profile-card-role${profile.role === 'self' ? ' is-you' : ''}`}
          >
            {ROLE_LABEL[profile.role]}
          </span>
        </div>
        <div className="profile-card-tagline">{profile.tagline}</div>
        <div className="profile-card-counts">{countsText(profile)}</div>
      </div>
    </div>
  );
}
