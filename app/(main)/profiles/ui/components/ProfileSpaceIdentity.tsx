import { initialsOf } from '@/app/(main)/users/ui/utils';
import { accentVars } from '@/lib/accent';
import type { ProfileCardView } from '@/lib/types';

// The space's own head IS the accent preview: it takes the form's live accent
// rather than the stored one, so picking a swatch repaints the band and the
// disc in place. Name and tagline stay as stored — an in-progress rename would
// otherwise blank the page's `<h1>` between keystrokes.
export default function ProfileSpaceIdentity({
  profile,
  accent,
}: {
  profile: ProfileCardView;
  accent: string;
}) {
  return (
    <>
      <div className="profile-space-band" style={accentVars(accent)}>
        <span className="profile-space-initials" aria-hidden>
          {initialsOf(profile.name)}
        </span>
      </div>
      <div className="profile-space-identity">
        <h1 className="profile-space-name">{profile.name}</h1>
        {profile.tagline && (
          <p className="profile-space-tagline">{profile.tagline}</p>
        )}
      </div>
    </>
  );
}
