import { randomAccentName } from '@/lib/accent';
import { rollAltvatar } from '@/lib/altvatar/shuffle';
import { getProfileMembership } from '@/lib/data/profile';
import { getAltvatarOptions } from '@/lib/data/profileAvatar';
import { authedUserId } from '@/lib/data/user.session';
import ProfileSettingsForm from '../ui/components/ProfileSettingsForm';
import ProfilePage from './ProfilePage';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AltvatarSpacePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const userId = await authedUserId();

  // One address, two audiences: a member administers the altvatar, and everyone
  // else — signed-out viewers included — gets the public view a shared link
  // lands on. The public view owns its own not-found and block handling.
  const profile = userId ? await getProfileMembership(userId, id) : null;
  if (!profile) {
    return <ProfilePage params={params} searchParams={searchParams} />;
  }

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
    <main className="container container--profile-space">
      <div className="profile-space">
        <ProfileSettingsForm
          profile={profile}
          draft={draft}
          readOnly={readOnly}
        />
      </div>
    </main>
  );
}
