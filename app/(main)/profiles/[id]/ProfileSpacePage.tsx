import { randomAccentName } from '@/lib/accent';
import { rollAltvatar } from '@/lib/altvatar/shuffle';
import { getProfileMembership } from '@/lib/data/profile';
import { getAltvatarOptions } from '@/lib/data/profileAvatar';
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

  // A face and a colour are rolled for a profile carrying neither, and written
  // only if the viewer submits — dismissing leaves the profile unset. Rolled
  // here rather than in the form: a roll taken in a client component would
  // differ between the server's render and the browser's.
  //
  // Only for a viewer who can act on it. A `manager` gets no submit control, so
  // rolling for them would paint the header with an identity nobody chose and
  // nobody can save; they see what the profile actually holds instead.
  const readOnly = profile.role === 'manager';
  const draft = readOnly
    ? null
    : {
        ...((await getAltvatarOptions(id)) ?? rollAltvatar()),
        accent: profile.accent ?? randomAccentName(),
      };

  return (
    <div className="profile-space">
      <ProfileSettingsForm
        profile={profile}
        draft={draft}
        readOnly={readOnly}
      />
    </div>
  );
}
