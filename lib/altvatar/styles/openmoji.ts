import type { AltvatarStyle } from '@/lib/altvatar/types';

// The thing kind's one style. Its art is picked, not generated from parts, so
// it declares no axes: the search surface writes `glyph` directly, no control
// stack or tab renders for it, and the DiceBear path never sees it.
export const openmojiStyle: AltvatarStyle = {
  id: 'openmoji',
  label: 'Thing',
  enumAxes: {},
  colorAxes: {},
};

// Worn until a picture is picked: legible at disc size, and not a creature
// anyone would mistake for a suggestion of what they are.
export const DEFAULT_GLYPH = '2B50';

// Codepoint filenames are stable where CLDR revises wording, so the URL is
// derivable from the stored value. Served out of `public/`, where
// scripts/build-openmoji.mjs puts the curated art.
export const openmojiArtUrl = (code: string | undefined): string =>
  `/openmoji/${code ?? DEFAULT_GLYPH}.svg`;
