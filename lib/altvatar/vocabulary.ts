import { EXTRA_AXES } from '@/lib/altvatar/axes.extras';
import { FACE_AXES } from '@/lib/altvatar/axes.face';
import { HAIR_AXES } from '@/lib/altvatar/axes.hair';
import { GLYPHS } from '@/lib/altvatar/styles/icons.glyphs';
import type {
  AxisTab,
  CanonicalAxis,
  CanonicalValue,
  ColorAxis,
  EnumAxis,
} from '@/lib/altvatar/types';

// The closed whitelist, assembled from the per-group tables. A native option
// carrying no row there does not exist as far as the app is concerned, so a
// library release adds nothing until someone names it. Split by group only for
// file size — this is one vocabulary, canonical and style-independent.

export const ENUM_AXES: Record<
  EnumAxis,
  { label: string; values: CanonicalValue[] }
> = {
  ...HAIR_AXES,
  ...FACE_AXES,
  ...EXTRA_AXES,
  glyph: {
    label: 'Icon',
    values: GLYPHS.map(({ value, label }) => ({ value, label })),
  },
} as Record<EnumAxis, { label: string; values: CanonicalValue[] }>;

export const COLOR_AXES: Record<ColorAxis, { label: string }> = {
  skinColor: { label: 'Skin' },
  hairColor: { label: 'Hair Colour' },
  facialHairColor: { label: 'Facial Hair Colour' },
  glassesColor: { label: 'Frame Colour' },
  hatColor: { label: 'Hat Colour' },
  clothingColor: { label: 'Clothing Colour' },
};

// The order controls are offered in, authored rather than falling out of how
// the style modules happen to declare their bindings. It runs base → hair →
// face → accessories → clothing, and keeps an axis next to the one it depends
// on: facial hair is drawn in the hair colour, and each garment sits beside the
// colour it takes. An axis a style does not have is simply skipped.
export const AXIS_ORDER: CanonicalAxis[] = [
  'skinColor',
  'hair',
  'rearHair',
  'hairColor',
  'facialHair',
  'facialHairColor',
  'eyebrows',
  'eyes',
  'nose',
  'mouth',
  'hat',
  'hatColor',
  'glasses',
  'glassesColor',
  'body',
  'clothing',
  'clothingGraphic',
  'clothingColor',
  'glyph',
];

// Which panel each axis belongs to. Grouping is what makes rendering every
// option as art affordable: only one panel's axes are drawn at a time, so a
// click re-renders a few dozen tiles rather than every option in the style.
export const AXIS_TABS: Record<CanonicalAxis, AxisTab> = {
  skinColor: 'Skin',
  hair: 'Hair',
  rearHair: 'Hair',
  hairColor: 'Hair',
  facialHair: 'Hair',
  facialHairColor: 'Hair',
  eyebrows: 'Face',
  eyes: 'Face',
  nose: 'Face',
  mouth: 'Face',
  hat: 'Extras',
  hatColor: 'Extras',
  glasses: 'Extras',
  glassesColor: 'Extras',
  body: 'Outfit',
  clothing: 'Outfit',
  clothingGraphic: 'Outfit',
  clothingColor: 'Outfit',
  glyph: 'Icon',
};

// Basics holds the style choice and the accent and nothing else, so it reads
// the same whichever style is selected; everything a style owns lives in a tab
// of its own, which only appears where that style has something to put in it.
export const TAB_ORDER: AxisTab[] = [
  'Basics',
  'Icon',
  'Skin',
  'Hair',
  'Face',
  'Extras',
  'Outfit',
];
