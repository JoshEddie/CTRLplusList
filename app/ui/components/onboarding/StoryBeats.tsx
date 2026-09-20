'use client';

// TODO(#343): split the extra components into their own files, then drop this disable
/* eslint-disable react/no-multi-comp */

import AltvatarPreview from '@/app/ui/components/altvatar/AltvatarPreview';
import ProfileAvatar, { facelessView } from '@/app/ui/components/ProfileAvatar';
import { accentVars } from '@/lib/accent';
import { NONE, type AltvatarValue } from '@/lib/altvatar/types';
import Image from 'next/image';

// An identity worn by a vignette: a sample one until the viewer picks a look,
// the viewer's own after — the swap is what the beats are for.
export type Persona = {
  name: string;
  accent: string;
  look: AltvatarValue | null;
};

function PersonaDisc({ persona }: { persona: Persona }) {
  return persona.look ? (
    <AltvatarPreview
      styleId={persona.look.style}
      options={persona.look.options}
      accent={persona.accent}
    />
  ) : (
    <ProfileAvatar profile={facelessView(persona.name)} />
  );
}

function ProfileVig({ persona, sub }: { persona: Persona; sub: string }) {
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

export // Vivid sample identities for the vignettes, worn until the viewer picks a
// look; their looks are the rolled `samples`, matched to these by index —
// except where an identity carries its own, because the roll draws an adult
// person and neither a household nor a baby is one.
const SAMPLE_IDENTITIES: {
  name: string;
  accent: string;
  look?: AltvatarValue;
}[] = [
  { name: 'Marisol', accent: 'ember' },
  { name: 'Dee', accent: 'denim' },
  { name: 'June', accent: 'rose' },
  {
    name: 'Baby',
    accent: 'ember',
    look: {
      style: 'personas',
      options: {
        seed: 'baby',
        selections: {
          hair: 'buzzcut',
          facialHair: NONE,
          eyes: 'happy',
          nose: 'small-round',
          mouth: 'pacifier',
          hat: NONE,
          glasses: NONE,
          body: 'small',
        },
      },
    },
  },
  {
    name: 'The Household',
    accent: 'juniper',
    look: {
      style: 'openmoji',
      options: { seed: 'household', selections: { glyph: '1F3E1' } },
    },
  },
];

export function IntroBeat({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <>
      <div className="onboarding-story-hd os-rise">
        <span className="onboarding-story-eyebrow">{eyebrow}</span>
        <h1 className="onboarding-story-title">{title}</h1>
      </div>
      <div className="onboarding-story-poster os-pop">
        <Image
          src="/ALTvatars_header.jpg"
          alt="Fifty Altvatars around the alt+vatar wordmark"
          width={775}
          height={550}
          priority
        />
      </div>
      <p className="onboarding-story-lede os-rise os-late">{lede}</p>
    </>
  );
}

export function EverywhereBeat({
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

export function ProfilesBeat({
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
