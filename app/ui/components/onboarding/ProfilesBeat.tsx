import ProfileVig from './ProfileVig';
import type { Persona } from './utils';

export default function ProfilesBeat({
  profiles,
  lede,
}: {
  profiles: { persona: Persona; sub: string }[];
  lede: string;
}) {
  return (
    <>
      <h2 className="onboarding-story-beat-title os-rise">Run more than one</h2>
      <div className="onboarding-vig-row">
        {profiles.map(({ persona, sub }) => (
          <ProfileVig key={sub} persona={persona} sub={sub} />
        ))}
      </div>
      <p className="onboarding-story-lede">{lede}</p>
    </>
  );
}
