import type { CanonicalValue } from '@/lib/altvatar/types';

// Colour axes are free hex fields rather than enums, so these palettes are the
// app's to author — the drawing library's defaults are only what its seed picks
// from when nothing is pinned.
//
// Shared across every style on purpose. Each style shipping its own near-miss
// of the same ramp is what made "Chestnut" two different browns, so a tone
// carried across a style switch stopped reading as chosen.

// Dark to light, then the two that are frankly not skin.
export const SKIN_TONES: CanonicalValue[] = [
  { value: '3f2a1d', label: 'Ebony' },
  { value: '614335', label: 'Cocoa' },
  { value: '763900', label: 'Espresso' },
  { value: '9e5622', label: 'Umber' },
  { value: 'ae5d29', label: 'Chestnut' },
  { value: 'c68642', label: 'Almond' },
  { value: 'd08b5b', label: 'Bronze' },
  { value: 'ecad80', label: 'Honey' },
  { value: 'edb98a', label: 'Peach' },
  { value: 'f2d3b1', label: 'Sand' },
  { value: 'ffdbb4', label: 'Ivory' },
  { value: 'fd9841', label: 'Tangerine' },
  { value: 'f8d25c', label: 'Gold' },
];

// The naturals every figurative style draws hair, beards and brows from, dark
// to light. One ramp rather than one per style, for the reason above.
export const HAIR_COLORS: CanonicalValue[] = [
  { value: '2c1b18', label: 'Black' },
  { value: '4a312c', label: 'Dark Brown' },
  { value: '724133', label: 'Brown' },
  { value: 'b58143', label: 'Golden Brown' },
  { value: 'a55728', label: 'Auburn' },
  { value: 'c93305', label: 'Red' },
  { value: 'd6b370', label: 'Blonde' },
  { value: 'ecdcbf', label: 'Platinum' },
  { value: 'e8e1e1', label: 'Silver' },
  { value: 'f59797', label: 'Pastel Pink' },
];

// Not naturalistic, and appended to whatever naturals a style ships.
export const DYE_COLORS: CanonicalValue[] = [
  { value: '3b6fd4', label: 'Blue' },
  { value: '2aa198', label: 'Teal' },
  { value: '3eac2c', label: 'Green' },
  { value: '7b3fb5', label: 'Purple' },
  { value: 'e0459b', label: 'Magenta' },
];

// Clothing and glasses frames draw from one list: the library ships two that
// differ by a single tone, and two near-identical palettes is how a name comes
// to mean two colours.
export const GARMENT_COLORS: CanonicalValue[] = [
  // Neutrals, dark to light.
  { value: '262e33', label: 'Black' },
  { value: '3c4f5c', label: 'Charcoal' },
  { value: '929598', label: 'Grey' },
  { value: 'e6e6e6', label: 'Light Grey' },
  { value: 'ffffff', label: 'White' },

  // Earths.
  { value: '5c3a25', label: 'Chocolate' },
  { value: 'b5471f', label: 'Rust' },
  { value: 'c8a678', label: 'Tan' },
  { value: 'ffdeb5', label: 'Cream' },

  // Reds into pinks.
  { value: '7a1f3d', label: 'Burgundy' },
  { value: 'ff5c5c', label: 'Red' },
  { value: 'ffafb9', label: 'Pink' },
  { value: 'ff488e', label: 'Magenta' },

  // Oranges into yellows.
  { value: 'f57c25', label: 'Orange' },
  { value: 'e0a92b', label: 'Mustard' },
  { value: 'ffffb1', label: 'Lemon' },

  // Greens.
  { value: '2e5d34', label: 'Forest' },
  { value: '8a8f3c', label: 'Olive' },
  { value: '4caf50', label: 'Green' },
  { value: 'a7ffc4', label: 'Mint' },

  // Teals into blues.
  { value: '1f8a8a', label: 'Teal' },
  { value: '7fd6d6', label: 'Aqua' },
  { value: '25557c', label: 'Navy' },
  { value: '5199e4', label: 'Blue' },
  { value: '65c9ff', label: 'Sky Blue' },
  { value: 'b1e2ff', label: 'Pale Blue' },

  // Purples, closing the wheel.
  { value: '6b47b8', label: 'Purple' },
  { value: 'c9b6f0', label: 'Lavender' },
];
