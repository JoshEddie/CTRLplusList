import type { CanonicalValue } from '@/lib/altvatar/types';
import { NONE } from '@/lib/altvatar/types';

export type AxisValues = { label: string; values: CanonicalValue[] };

// Part of the closed whitelist. A native option carrying no row here does not
// exist as far as the app is concerned. Labels are hand-authored, never derived
// at runtime: a derived label would put an opaque native name one missing
// override away from the screen, which is the failure this table prevents.
//
// A style that draws glasses as a pair of eyes rather than as an accessory
// still maps them onto `glasses` here, so the choice reads the same wherever
// it is offered.

export const EXTRA_AXES: Record<string, AxisValues> = {
  glasses: {
    label: 'Glasses',
    values: [
      { value: NONE, label: 'None' },
      { value: 'kurt', label: 'Small Round' },
      { value: 'prescription-1', label: 'Rectangular' },
      { value: 'prescription-2', label: 'Oval' },
      { value: 'round', label: 'Round' },
      { value: 'sunglasses', label: 'Sunglasses' },
      { value: 'wayfarers', label: 'Wayfarers' },
      { value: 'eyepatch', label: 'Eyepatch' },
    ],
  },
  facialHair: {
    label: 'Facial Hair',
    values: [
      { value: NONE, label: 'None' },
      { value: 'beard-light', label: 'Stubble' },
      { value: 'beard-medium', label: 'Beard' },
      { value: 'beard-majestic', label: 'Full Beard' },
      { value: 'beard-pyramid', label: 'Pyramid Beard' },
      { value: 'goatee', label: 'Goatee' },
      { value: 'soul-patch', label: 'Soul Patch' },
      { value: 'moustache-fancy', label: 'Moustache' },
      { value: 'moustache-magnum', label: 'Handlebar Moustache' },
    ],
  },
  body: {
    label: 'Build',
    values: [
      { value: 'squared', label: 'Squared' },
      { value: 'rounded', label: 'Rounded' },
      { value: 'small', label: 'Small' },
      { value: 'checkered', label: 'Checkered' },
    ],
  },
  clothing: {
    label: 'Clothing',
    values: [
      { value: 'shirt-crew-neck', label: 'Crew Neck' },
      { value: 'shirt-scoop-neck', label: 'Scoop Neck' },
      { value: 'shirt-vneck', label: 'V-Neck' },
      { value: 'shirt-collared', label: 'Collared Shirt' },
      { value: 'turtleneck', label: 'Turtleneck' },
      { value: 'graphic-shirt', label: 'Graphic Tee' },
      { value: 'hoodie', label: 'Hoodie' },
      { value: 'overall', label: 'Overalls' },
      { value: 'dress', label: 'Dress' },
      { value: 'blazer-and-shirt', label: 'Blazer and Shirt' },
      { value: 'blazer-and-sweater', label: 'Blazer and Sweater' },
      { value: 'collar-and-sweater', label: 'Collar and Sweater' },
    ],
  },
  clothingGraphic: {
    label: 'Graphic',
    values: [
      { value: 'bat', label: 'Bat' },
      { value: 'bear', label: 'Bear' },
      { value: 'cumbia', label: 'Cumbia' },
      { value: 'deer', label: 'Deer' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'hola', label: 'Hola' },
      { value: 'pizza', label: 'Pizza' },
      { value: 'resist', label: 'Resist' },
      { value: 'skull', label: 'Skull' },
      { value: 'skull-outline', label: 'Skull Outline' },
    ],
  },
};
