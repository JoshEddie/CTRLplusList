import { NONE, type AltvatarValue } from '@/lib/altvatar/types';

// An identity worn by a vignette: a sample one until the viewer picks a look,
// the viewer's own after — the swap is what the beats are for.
export type Persona = {
  name: string;
  accent: string;
  look: AltvatarValue | null;
};

// Vivid sample identities for the vignettes, worn until the viewer picks a
// look; their looks are the rolled `samples`, matched to these by index —
// except where an identity carries its own, because the roll draws an adult
// person and neither a household nor a baby is one.
export const SAMPLE_IDENTITIES: {
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
