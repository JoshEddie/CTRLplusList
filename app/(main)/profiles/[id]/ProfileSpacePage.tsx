import { randomAccentName } from '@/lib/accent';
import { getProfileMembership } from '@/lib/data/profile';
import { authedUserId } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ProfileSettingsForm from '../ui/components/ProfileSettingsForm';

export default async function ProfileSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await authedUserId();
  if (!userId) redirect('/');

  // A non-member and an id no profile carries produce the same redirect, so
  // the surface discloses no profile's existence to a viewer with no claim.
  const profile = await getProfileMembership(userId, id);
  if (!profile) redirect('/profiles');

  // Rolled per render for a profile carrying no accent, and written only if
  // the viewer submits — dismissing leaves the profile unset.
  const suggestedAccent = profile.accent ?? randomAccentName();

  return (
    <div className="profile-space">
      <ProfileSettingsForm
        profile={profile}
        suggestedAccent={suggestedAccent}
        readOnly={profile.role === 'manager'}
      />
    </div>
  );
}
