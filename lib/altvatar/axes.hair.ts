import type { CanonicalValue } from '@/lib/altvatar/types';
import { NONE } from '@/lib/altvatar/types';

export type AxisValues = { label: string; values: CanonicalValue[] };

// Part of the closed whitelist. A native option carrying no row here does not
// exist as far as the app is concerned. Labels are hand-authored, never derived
// at runtime: a derived label would put an opaque native name one missing
// override away from the screen, which is the failure this table prevents.
//
// A row names what it draws, never what one style calls it, and a style that
// files headwear inside its own hair option maps those values onto `hat`
// rather than growing rows here for them.

export const HAIR_AXES: Record<string, AxisValues> = {
  hair: {
    label: 'Hair',
    values: [
      { value: NONE, label: 'None' },
      { value: 'bald', label: 'Bald' },
      { value: 'balding', label: 'Balding' },
      { value: 'buzzcut', label: 'Buzzcut' },
      { value: 'fade', label: 'Fade' },
      { value: 'undercut', label: 'Undercut' },
      { value: 'spiky', label: 'Spiky' },
      { value: 'mohawk', label: 'Mohawk' },
      { value: 'side-part', label: 'Side Part' },
      { value: 'side-part-chops', label: 'Side Part with Chops' },
      { value: 'the-caesar', label: 'Caesar' },
      { value: 'the-caesar-and-side-part', label: 'Caesar with Side Part' },
      { value: 'short-flat', label: 'Short Flat' },
      { value: 'short-round', label: 'Short Round' },
      { value: 'short-waved', label: 'Short Waved' },
      { value: 'short-curly', label: 'Short Curly' },
      { value: 'sides', label: 'Sides' },
      { value: 'shaved-sides', label: 'Shaved Sides' },
      { value: 'frizzle', label: 'Frizzle' },
      { value: 'shaggy', label: 'Shaggy' },
      { value: 'shaggy-mullet', label: 'Shaggy Mullet' },
      { value: 'curly', label: 'Curly' },
      { value: 'curly-high-top', label: 'Curly High Top' },
      { value: 'fro', label: 'Fro' },
      { value: 'fro-band', label: 'Fro with Band' },
      { value: 'big-hair', label: 'Big Hair' },
      { value: 'dreads', label: 'Dreads' },
      { value: 'dreads-1', label: 'Dreads, Short' },
      { value: 'dreads-2', label: 'Dreads, Long' },
      { value: 'bob', label: 'Bob' },
      { value: 'bob-bangs', label: 'Bob with Bangs' },
      { value: 'mia-wallace', label: 'Blunt Bob' },
      { value: 'pigtails', label: 'Pigtails' },
      { value: 'bun', label: 'Bun' },
      { value: 'curly-bun', label: 'Curly Bun' },
      { value: 'bun-undercut', label: 'Bun with Undercut' },
      { value: 'straight-1', label: 'Straight' },
      { value: 'straight-2', label: 'Straight, Long' },
      { value: 'straight-and-strand', label: 'Straight with Strand' },
      { value: 'curvy', label: 'Curvy' },
      { value: 'frida', label: 'Frida' },
      { value: 'long-mid', label: 'Mid Length' },
      { value: 'extra-long', label: 'Extra Long' },
    ],
  },
  // Hair drawn behind the head, which one style separates from the hair on top
  // so the two combine. A style without the split simply has no such axis.
  rearHair: {
    label: 'Hair Length',
    values: [
      { value: NONE, label: 'None' },
      { value: 'neck-high', label: 'To the Neck' },
      { value: 'shoulder-high', label: 'To the Shoulder' },
      { value: 'long-straight', label: 'Long, Straight' },
      { value: 'long-wavy', label: 'Long, Wavy' },
    ],
  },
  hat: {
    label: 'Hat',
    values: [
      { value: NONE, label: 'None' },
      { value: 'hat', label: 'Hat' },
      { value: 'hijab', label: 'Hijab' },
      { value: 'turban', label: 'Turban' },
      { value: 'winter-hat-1', label: 'Winter Hat' },
      { value: 'winter-hat-2', label: 'Bobble Hat' },
      { value: 'winter-hat-3', label: 'Earflap Hat' },
      { value: 'winter-hat-4', label: 'Beanie' },
    ],
  },
};
