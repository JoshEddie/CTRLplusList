import type { AltvatarStyle } from '@/lib/altvatar/types';

// The thing kind's one style. Its art is a full-colour picture picked from the
// bundled OpenMoji set rather than generated from parts, so it declares no
// axes: the search surface writes the `glyph` selection directly, no control
// stack or tab renders for it, and the DiceBear path never sees it.
export const openmojiStyle: AltvatarStyle = {
  id: 'openmoji',
  label: 'Thing',
  enumAxes: {},
  colorAxes: {},
};

// The star, worn until a picture is picked: neutral, legible at disc size, and
// not a creature anyone would mistake for a suggestion of what they are.
export const DEFAULT_GLYPH = '2B50';

// The stored value is the OpenMoji codepoint — filenames are codepoint hex and
// stable, while CLDR revises wording — so the art URL is derivable from it.
export const openmojiArtUrl = (code: string | undefined): string =>
  `/api/openmoji/${code ?? DEFAULT_GLYPH}`;
