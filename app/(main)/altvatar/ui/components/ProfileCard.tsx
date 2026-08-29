'use client';

import ProfileAvatar from '@/app/ui/components/ProfileAvatar';
import { accentVars } from '@/lib/accent';
import type { ProfileCardView } from '@/lib/types';
import { useProfileSwitch } from '@/app/ui/components/ProfileSwitchProvider';
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

export default function ProfileCard({
  profile,
  activeProfileId,
}: {
  profile: ProfileCardView;
  activeProfileId: string;
}) {
  const isActive = profile.id === activeProfileId;
  const switchProfile = useProfileSwitch();

  return (
    <div
      className={`profile-card${isActive ? ' is-active' : ''}`}
      style={accentVars(profile.accent)}
      // The body is the fast path to switching, not the accessible one: it is
      // a region rather than a control, so the menu's `Switch to` row is what a
      // viewer without a pointer uses. The menu stops propagation, so opening
      // it does not also switch.
      onClick={isActive ? undefined : () => switchProfile(profile.id)}
    >
      <div className="profile-card-band">
        <ProfileCardMenu
          profileId={profile.id}
          profileName={profile.name}
          isActive={isActive}
          onSwitch={switchProfile}
        />
        <ProfileAvatar
          profile={profile}
          className="profile-card-avatar"
        />
        {isActive && (
          <span className="profile-card-active">
            <span aria-hidden>✓</span>
            <span className="sr-only">Active Altvatar</span>
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
