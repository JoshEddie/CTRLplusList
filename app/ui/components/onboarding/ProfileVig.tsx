import { accentVars } from '@/lib/accent';
import PersonaDisc from './PersonaDisc';
import type { Persona } from './utils';

export default function ProfileVig({
  persona,
  sub,
}: {
  persona: Persona;
  sub: string;
}) {
  return (
    <div
      className="onboarding-vig onboarding-vig-profile"
      style={accentVars(persona.accent)}
    >
      <span className="onboarding-vig-band-top" />
      <PersonaDisc persona={persona} />
      <span className="onboarding-vig-profile-name">
        <span className="onboarding-vig-serif onboarding-vig-ink">
          {persona.name}
        </span>
        <span className="onboarding-vig-sub">{sub}</span>
      </span>
    </div>
  );
}
