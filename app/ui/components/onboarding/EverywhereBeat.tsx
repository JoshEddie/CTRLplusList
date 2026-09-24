import { accentVars } from '@/lib/accent';
import PersonaDisc from './PersonaDisc';
import ProfileVig from './ProfileVig';
import type { Persona } from './utils';

export default function EverywhereBeat({
  owners,
  lede,
}: {
  owners: [Persona, Persona, Persona];
  lede: string;
}) {
  const [a, b, c] = owners;
  return (
    <>
      <h2 className="onboarding-story-beat-title os-rise">
        One look, everywhere you show up
      </h2>
      <div className="onboarding-vig-row">
        <div
          className="onboarding-vig onboarding-vig-list"
          style={accentVars(a.accent)}
        >
          <span className="onboarding-vig-band-left" />
          <span className="onboarding-vig-serif">Birthday 2026</span>
          <span className="onboarding-vig-owner">
            <PersonaDisc persona={a} />
            <span>{a.name}</span>
          </span>
          <span className="onboarding-vig-tag">Birthday</span>
        </div>
        <div className="onboarding-vig" style={accentVars(b.accent)}>
          <span className="onboarding-vig-serif">Espresso Machine</span>
          <span className="onboarding-vig-claimed">
            <PersonaDisc persona={b} />
            <span>Claimed</span>
          </span>
        </div>
        <ProfileVig persona={c} sub="Following" />
      </div>
      <p className="onboarding-story-lede">{lede}</p>
    </>
  );
}
