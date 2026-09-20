import type { CanonicalValue } from '@/lib/altvatar/types';

export type AxisValues = { label: string; values: CanonicalValue[] };

// Part of the closed whitelist. A native option carrying no row here does not
// exist as far as the app is concerned. Labels are hand-authored, never derived
// at runtime: a derived label would put an opaque native name one missing
// override away from the screen, which is the failure this table prevents.
//
// Values are scoped to their axis, so the `surprised` a mouth can hold and the
// `surprised` a pair of eyes can hold are separate rows naming separate parts.

export const FACE_AXES: Record<string, AxisValues> = {
  eyebrows: {
    label: 'Eyebrows',
    values: [
      { value: 'natural', label: 'Natural' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'flat', label: 'Flat' },
      { value: 'angry', label: 'Angry' },
      { value: 'angry-natural', label: 'Angry, Natural' },
      { value: 'frown', label: 'Frown' },
      { value: 'raised', label: 'Raised' },
      { value: 'raised-natural', label: 'Raised, Natural' },
      { value: 'sad', label: 'Sad' },
      { value: 'sad-natural', label: 'Sad, Natural' },
      { value: 'up-down', label: 'Up and Down' },
      { value: 'up-down-natural', label: 'Up and Down, Natural' },
      { value: 'unibrow', label: 'Unibrow' },
    ],
  },
  eyes: {
    label: 'Eyes',
    values: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'happy', label: 'Happy' },
      { value: 'closed', label: 'Closed' },
      { value: 'squint', label: 'Squint' },
      { value: 'surprised', label: 'Surprised' },
      { value: 'side', label: 'Side Glance' },
      { value: 'eye-roll', label: 'Eye Roll' },
      { value: 'wink', label: 'Wink' },
      { value: 'wink-wacky', label: 'Wacky Wink' },
      { value: 'cry', label: 'Teary' },
      { value: 'hearts', label: 'Hearts' },
      { value: 'dizzy', label: 'Dizzy' },
    ],
  },
  nose: {
    label: 'Nose',
    values: [
      { value: 'small-round', label: 'Small and Round' },
      { value: 'medium-round', label: 'Medium and Round' },
      { value: 'wrinkles', label: 'Wrinkled' },
    ],
  },
  mouth: {
    label: 'Mouth',
    values: [
      { value: 'neutral', label: 'Neutral' },
      { value: 'serious', label: 'Serious' },
      { value: 'smile', label: 'Smile' },
      { value: 'smirk', label: 'Smirk' },
      { value: 'twinkle', label: 'Twinkle' },
      { value: 'laughing', label: 'Laughing' },
      { value: 'surprised', label: 'Surprised' },
      { value: 'scream-open', label: 'Screaming' },
      { value: 'grimace', label: 'Grimace' },
      { value: 'concerned', label: 'Concerned' },
      { value: 'disbelief', label: 'Disbelief' },
      { value: 'frown', label: 'Frown' },
      { value: 'sad', label: 'Sad' },
      { value: 'lips', label: 'Lips' },
      { value: 'tongue', label: 'Tongue Out' },
      { value: 'eating', label: 'Eating' },
      { value: 'pacifier', label: 'Pacifier' },
      { value: 'vomit', label: 'Sick' },
    ],
  },
};
